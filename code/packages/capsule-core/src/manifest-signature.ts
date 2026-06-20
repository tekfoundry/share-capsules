import { MANIFEST_SIGNATURE_ALGORITHM_ID } from './cryptographic-suite.js';
import { decodeBase64Url, encodeBase64Url } from './base64url.js';
import { canonicalizeJsonBytes } from './canonical-json.js';
import { parseCapsuleManifest } from './manifest.js';

export const ED25519_PUBLIC_KEY_BYTES = 32 as const;
export const ED25519_SIGNATURE_BYTES = 64 as const;

export interface Ed25519CryptoProvider {
    exportKey: SubtleCrypto['exportKey'];
    importKey: SubtleCrypto['importKey'];
    sign: SubtleCrypto['sign'];
    verify: SubtleCrypto['verify'];
}

export class ManifestSignatureError extends Error {
    public constructor(
        public readonly code:
            | 'cryptography_unavailable'
            | 'invalid_private_signing_key'
            | 'invalid_public_signing_key'
            | 'signing_key_mismatch',
        message: string,
    ) {
        super(message);
        this.name = 'ManifestSignatureError';
    }
}

export function canonicalizeCapsuleManifest(value: unknown): Uint8Array {
    const manifest = parseCapsuleManifest(value);
    return canonicalizeJsonBytes(manifest);
}

export async function signDetachedEd25519(
    message: Uint8Array,
    privateKey: CryptoKey,
    provider: Ed25519CryptoProvider = defaultCryptoProvider(),
): Promise<Uint8Array> {
    assertSigningKey(privateKey);

    const signature = new Uint8Array(
        await provider.sign(MANIFEST_SIGNATURE_ALGORITHM_ID, privateKey, asArrayBuffer(message)),
    );

    if (signature.byteLength !== ED25519_SIGNATURE_BYTES) {
        throw new ManifestSignatureError(
            'invalid_private_signing_key',
            'The signing operation returned an invalid Ed25519 signature length.',
        );
    }

    return signature;
}

export async function verifyDetachedEd25519(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: CryptoKey,
    provider: Ed25519CryptoProvider = defaultCryptoProvider(),
): Promise<boolean> {
    assertVerificationKey(publicKey);

    if (signature.byteLength !== ED25519_SIGNATURE_BYTES) {
        return false;
    }

    return provider.verify(
        MANIFEST_SIGNATURE_ALGORITHM_ID,
        publicKey,
        asArrayBuffer(signature),
        asArrayBuffer(message),
    );
}

export async function signCapsuleManifest(
    value: unknown,
    signingKeys: CryptoKeyPair,
    provider: Ed25519CryptoProvider = defaultCryptoProvider(),
): Promise<Uint8Array> {
    const manifest = parseCapsuleManifest(value);
    assertSigningKey(signingKeys.privateKey);
    assertVerificationKey(signingKeys.publicKey);

    const rawPublicKey = new Uint8Array(await provider.exportKey('raw', signingKeys.publicKey));
    if (encodeBase64Url(rawPublicKey) !== manifest.creator.signing_key.public_key) {
        throw new ManifestSignatureError(
            'signing_key_mismatch',
            'The signing key does not match the creator key declared by the manifest.',
        );
    }

    const canonicalManifest = canonicalizeJsonBytes(manifest);
    const signature = await signDetachedEd25519(
        canonicalManifest,
        signingKeys.privateKey,
        provider,
    );

    if (
        !(await verifyDetachedEd25519(
            canonicalManifest,
            signature,
            signingKeys.publicKey,
            provider,
        ))
    ) {
        throw new ManifestSignatureError(
            'signing_key_mismatch',
            'The private signing key does not match the declared creator public key.',
        );
    }

    return signature;
}

export async function verifyCapsuleManifestSignature(
    value: unknown,
    signature: Uint8Array,
    provider: Ed25519CryptoProvider = defaultCryptoProvider(),
): Promise<boolean> {
    const manifest = parseCapsuleManifest(value);
    const publicKey = await importEd25519PublicKey(
        decodeBase64Url(manifest.creator.signing_key.public_key),
        provider,
    );

    return verifyDetachedEd25519(canonicalizeJsonBytes(manifest), signature, publicKey, provider);
}

export async function importEd25519PublicKey(
    rawPublicKey: Uint8Array,
    provider: Ed25519CryptoProvider = defaultCryptoProvider(),
): Promise<CryptoKey> {
    if (rawPublicKey.byteLength !== ED25519_PUBLIC_KEY_BYTES) {
        throw new ManifestSignatureError(
            'invalid_public_signing_key',
            'An Ed25519 public key must contain exactly 32 bytes.',
        );
    }

    return provider.importKey(
        'raw',
        asArrayBuffer(rawPublicKey),
        MANIFEST_SIGNATURE_ALGORITHM_ID,
        true,
        ['verify'],
    );
}

function assertSigningKey(key: CryptoKey): void {
    if (
        key.type !== 'private' ||
        key.algorithm.name !== MANIFEST_SIGNATURE_ALGORITHM_ID ||
        !key.usages.includes('sign')
    ) {
        throw new ManifestSignatureError(
            'invalid_private_signing_key',
            'Signing requires a private Ed25519 key with sign usage.',
        );
    }
}

function assertVerificationKey(key: CryptoKey): void {
    if (
        key.type !== 'public' ||
        key.algorithm.name !== MANIFEST_SIGNATURE_ALGORITHM_ID ||
        !key.usages.includes('verify')
    ) {
        throw new ManifestSignatureError(
            'invalid_public_signing_key',
            'Verification requires a public Ed25519 key with verify usage.',
        );
    }
}

function defaultCryptoProvider(): Ed25519CryptoProvider {
    if (globalThis.crypto?.subtle === undefined) {
        throw new ManifestSignatureError(
            'cryptography_unavailable',
            'Web Cryptography is not available in this runtime.',
        );
    }

    return globalThis.crypto.subtle;
}

function asArrayBuffer(value: Uint8Array): ArrayBuffer {
    return value.slice().buffer;
}
