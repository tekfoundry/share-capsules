import { canonicalizeJsonBytes } from './canonical-json.js';
import {
    CAPSULE_CRYPTOGRAPHIC_SUITE_V1,
    CAPSULE_SUITE_ID,
    PAYLOAD_ENCRYPTION_ALGORITHM_ID,
} from './cryptographic-suite.js';
import { parseCapsuleManifest, type CapsuleManifestV1, type CapsulePayloadV1 } from './manifest.js';

export const PAYLOAD_AAD_TYPE = 'ctx-capsule-payload-aad' as const;
export const PAYLOAD_AAD_VERSION = '1.0' as const;
export const WEB_CRYPTO_AES_GCM_ID = 'AES-GCM' as const;

export interface PayloadEncryptionContextV1 {
    readonly type: typeof PAYLOAD_AAD_TYPE;
    readonly version: typeof PAYLOAD_AAD_VERSION;
    readonly cryptographic_suite: typeof CAPSULE_SUITE_ID;
    readonly capsule: {
        readonly id: string;
        readonly revision: number;
    };
    readonly content_profile: {
        readonly id: CapsuleManifestV1['content_profile']['id'];
        readonly version: CapsuleManifestV1['content_profile']['version'];
    };
    readonly payload: {
        readonly id: string;
        readonly path: string;
        readonly media_type: CapsulePayloadV1['media_type'];
        readonly plaintext_size: number;
    };
}

export interface PayloadEncryptionResultV1 {
    readonly ciphertext: Uint8Array;
    readonly nonce: Uint8Array;
    readonly associatedData: Uint8Array;
}

export interface PayloadCryptoProvider {
    decrypt: SubtleCrypto['decrypt'];
    encrypt: SubtleCrypto['encrypt'];
    importKey: SubtleCrypto['importKey'];
}

export type RandomByteFiller = (target: Uint8Array) => void;

export class PayloadEncryptionError extends Error {
    public constructor(
        public readonly code:
            | 'authentication_failed'
            | 'cryptography_unavailable'
            | 'encryption_failed'
            | 'invalid_ciphertext_length'
            | 'invalid_content_key'
            | 'invalid_nonce'
            | 'plaintext_size_mismatch',
        message: string,
    ) {
        super(message);
        this.name = 'PayloadEncryptionError';
    }
}

export function payloadEncryptionContextFromManifest(value: unknown): PayloadEncryptionContextV1 {
    const manifest = parseCapsuleManifest(value);
    const payload = manifest.payloads[0];

    return Object.freeze({
        type: PAYLOAD_AAD_TYPE,
        version: PAYLOAD_AAD_VERSION,
        cryptographic_suite: CAPSULE_SUITE_ID,
        capsule: Object.freeze({
            id: manifest.capsule.id,
            revision: manifest.capsule.revision,
        }),
        content_profile: Object.freeze({
            id: manifest.content_profile.id,
            version: manifest.content_profile.version,
        }),
        payload: Object.freeze({
            id: payload.id,
            path: payload.path,
            media_type: payload.media_type,
            plaintext_size: payload.plaintext_size,
        }),
    });
}

export function canonicalizePayloadAssociatedData(context: PayloadEncryptionContextV1): Uint8Array {
    return canonicalizeJsonBytes(context);
}

export function generatePayloadContentKey(
    fillRandom: RandomByteFiller = defaultRandomFiller,
): Uint8Array {
    return generateRandomBytes(
        CAPSULE_CRYPTOGRAPHIC_SUITE_V1.payloadEncryption.keyBytes,
        fillRandom,
    );
}

export function generatePayloadNonce(
    fillRandom: RandomByteFiller = defaultRandomFiller,
): Uint8Array {
    return generateRandomBytes(
        CAPSULE_CRYPTOGRAPHIC_SUITE_V1.payloadEncryption.nonceBytes,
        fillRandom,
    );
}

export async function encryptAes256Gcm(
    plaintext: Uint8Array,
    rawContentKey: Uint8Array,
    nonce: Uint8Array,
    associatedData: Uint8Array,
    provider: PayloadCryptoProvider = defaultCryptoProvider(),
): Promise<Uint8Array> {
    assertContentKey(rawContentKey);
    assertNonce(nonce);

    const contentKey = await importContentKey(rawContentKey, ['encrypt'], provider);

    try {
        return new Uint8Array(
            await provider.encrypt(
                aesGcmParameters(nonce, associatedData),
                contentKey,
                asArrayBuffer(plaintext),
            ),
        );
    } catch {
        throw new PayloadEncryptionError('encryption_failed', 'Payload encryption failed.');
    }
}

export async function decryptAes256Gcm(
    ciphertext: Uint8Array,
    rawContentKey: Uint8Array,
    nonce: Uint8Array,
    associatedData: Uint8Array,
    provider: PayloadCryptoProvider = defaultCryptoProvider(),
): Promise<Uint8Array> {
    assertContentKey(rawContentKey);
    assertNonce(nonce);

    if (ciphertext.byteLength < CAPSULE_CRYPTOGRAPHIC_SUITE_V1.payloadEncryption.tagBytes) {
        throw new PayloadEncryptionError(
            'invalid_ciphertext_length',
            'Ciphertext is shorter than the required authentication tag.',
        );
    }

    const contentKey = await importContentKey(rawContentKey, ['decrypt'], provider);

    try {
        return new Uint8Array(
            await provider.decrypt(
                aesGcmParameters(nonce, associatedData),
                contentKey,
                asArrayBuffer(ciphertext),
            ),
        );
    } catch {
        throw new PayloadEncryptionError('authentication_failed', 'Payload authentication failed.');
    }
}

export async function encryptPayloadV1(
    plaintext: Uint8Array,
    rawContentKey: Uint8Array,
    nonce: Uint8Array,
    context: PayloadEncryptionContextV1,
    provider: PayloadCryptoProvider = defaultCryptoProvider(),
): Promise<PayloadEncryptionResultV1> {
    if (plaintext.byteLength !== context.payload.plaintext_size) {
        throw new PayloadEncryptionError(
            'plaintext_size_mismatch',
            'Plaintext length does not match the signed payload declaration.',
        );
    }

    const associatedData = canonicalizePayloadAssociatedData(context);
    const ciphertext = await encryptAes256Gcm(
        plaintext,
        rawContentKey,
        nonce,
        associatedData,
        provider,
    );

    const expectedCiphertextLength =
        plaintext.byteLength + CAPSULE_CRYPTOGRAPHIC_SUITE_V1.payloadEncryption.tagBytes;
    if (ciphertext.byteLength !== expectedCiphertextLength) {
        throw new PayloadEncryptionError(
            'invalid_ciphertext_length',
            'Ciphertext length does not include the required authentication tag.',
        );
    }

    return Object.freeze({
        ciphertext,
        nonce: nonce.slice(),
        associatedData,
    });
}

export async function decryptPayloadV1(
    ciphertext: Uint8Array,
    rawContentKey: Uint8Array,
    nonce: Uint8Array,
    context: PayloadEncryptionContextV1,
    provider: PayloadCryptoProvider = defaultCryptoProvider(),
): Promise<Uint8Array> {
    const expectedCiphertextLength =
        context.payload.plaintext_size + CAPSULE_CRYPTOGRAPHIC_SUITE_V1.payloadEncryption.tagBytes;
    if (ciphertext.byteLength !== expectedCiphertextLength) {
        throw new PayloadEncryptionError(
            'invalid_ciphertext_length',
            'Ciphertext length does not match the signed payload declaration.',
        );
    }

    const plaintext = await decryptAes256Gcm(
        ciphertext,
        rawContentKey,
        nonce,
        canonicalizePayloadAssociatedData(context),
        provider,
    );

    if (plaintext.byteLength !== context.payload.plaintext_size) {
        throw new PayloadEncryptionError(
            'plaintext_size_mismatch',
            'Decrypted plaintext length does not match the signed payload declaration.',
        );
    }

    return plaintext;
}

async function importContentKey(
    rawContentKey: Uint8Array,
    usages: KeyUsage[],
    provider: PayloadCryptoProvider,
): Promise<CryptoKey> {
    return provider.importKey(
        'raw',
        asArrayBuffer(rawContentKey),
        WEB_CRYPTO_AES_GCM_ID,
        false,
        usages,
    );
}

function assertContentKey(rawContentKey: Uint8Array): void {
    if (rawContentKey.byteLength !== CAPSULE_CRYPTOGRAPHIC_SUITE_V1.payloadEncryption.keyBytes) {
        throw new PayloadEncryptionError(
            'invalid_content_key',
            `${PAYLOAD_ENCRYPTION_ALGORITHM_ID} requires a 32-byte content key.`,
        );
    }
}

function assertNonce(nonce: Uint8Array): void {
    if (nonce.byteLength !== CAPSULE_CRYPTOGRAPHIC_SUITE_V1.payloadEncryption.nonceBytes) {
        throw new PayloadEncryptionError(
            'invalid_nonce',
            `${PAYLOAD_ENCRYPTION_ALGORITHM_ID} requires a 12-byte nonce.`,
        );
    }
}

function aesGcmParameters(nonce: Uint8Array, associatedData: Uint8Array): AesGcmParams {
    return {
        name: WEB_CRYPTO_AES_GCM_ID,
        iv: asArrayBuffer(nonce),
        additionalData: asArrayBuffer(associatedData),
        tagLength: CAPSULE_CRYPTOGRAPHIC_SUITE_V1.payloadEncryption.tagBytes * 8,
    };
}

function defaultCryptoProvider(): PayloadCryptoProvider {
    if (globalThis.crypto?.subtle === undefined) {
        throw new PayloadEncryptionError(
            'cryptography_unavailable',
            'Web Cryptography is not available in this runtime.',
        );
    }

    return globalThis.crypto.subtle;
}

function defaultRandomFiller(target: Uint8Array): void {
    if (globalThis.crypto?.getRandomValues === undefined) {
        throw new PayloadEncryptionError(
            'cryptography_unavailable',
            'A cryptographically secure random source is not available in this runtime.',
        );
    }

    const randomBytes = new Uint8Array(target.byteLength);
    globalThis.crypto.getRandomValues(randomBytes);
    target.set(randomBytes);
}

function generateRandomBytes(length: number, fillRandom: RandomByteFiller): Uint8Array {
    const value = new Uint8Array(length);
    try {
        fillRandom(value);
        return value;
    } catch (error) {
        value.fill(0);
        throw error;
    }
}

function asArrayBuffer(value: Uint8Array): ArrayBuffer {
    return value.slice().buffer;
}
