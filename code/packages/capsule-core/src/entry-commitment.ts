import { encodeBase64Url } from './base64url.js';
import { canonicalizeCapsuleManifest } from './manifest-signature.js';
import {
    parseCapsuleManifest,
    validateArchiveEntryNames,
    type CapsuleManifestV1,
} from './manifest.js';

export const SHA256_BYTES = 32 as const;

export interface DigestProvider {
    digest: SubtleCrypto['digest'];
}

export interface CapsuleArchiveEntryV1 {
    readonly name: string;
    readonly bytes: Uint8Array;
}

export class EntryCommitmentError extends Error {
    public constructor(
        public readonly code:
            | 'cryptography_unavailable'
            | 'digest_failed'
            | 'invalid_digest_result'
            | 'payload_digest_mismatch'
            | 'payload_length_mismatch',
        public readonly entryName: string,
        message: string,
    ) {
        super(message);
        this.name = 'EntryCommitmentError';
    }
}

export async function sha256(
    value: Uint8Array,
    provider: DigestProvider = defaultDigestProvider(),
): Promise<Uint8Array> {
    let digest: Uint8Array;
    try {
        digest = new Uint8Array(await provider.digest('SHA-256', asArrayBuffer(value)));
    } catch {
        throw new EntryCommitmentError('digest_failed', '', 'SHA-256 computation failed.');
    }

    if (digest.byteLength !== SHA256_BYTES) {
        throw new EntryCommitmentError(
            'invalid_digest_result',
            '',
            'The digest provider returned an invalid SHA-256 length.',
        );
    }

    return digest;
}

export async function sha256Base64Url(
    value: Uint8Array,
    provider: DigestProvider = defaultDigestProvider(),
): Promise<string> {
    return encodeBase64Url(await sha256(value, provider));
}

export async function canonicalManifestSha256(
    value: unknown,
    provider: DigestProvider = defaultDigestProvider(),
): Promise<string> {
    return sha256Base64Url(canonicalizeCapsuleManifest(value), provider);
}

export async function validatePayloadEntryCommitment(
    manifest: CapsuleManifestV1,
    encryptedPayload: Uint8Array,
    provider: DigestProvider = defaultDigestProvider(),
): Promise<void> {
    const payload = manifest.payloads[0];

    if (encryptedPayload.byteLength !== payload.ciphertext_size) {
        throw new EntryCommitmentError(
            'payload_length_mismatch',
            payload.path,
            'Encrypted payload length does not match the signed manifest declaration.',
        );
    }

    const actualDigest = await sha256Base64Url(encryptedPayload, provider);
    if (actualDigest !== payload.ciphertext_sha256) {
        throw new EntryCommitmentError(
            'payload_digest_mismatch',
            payload.path,
            'Encrypted payload digest does not match the signed manifest commitment.',
        );
    }
}

export async function validateCapsuleEntryCommitments(
    manifestValue: unknown,
    entries: readonly CapsuleArchiveEntryV1[],
    provider: DigestProvider = defaultDigestProvider(),
): Promise<CapsuleManifestV1> {
    const manifest = parseCapsuleManifest(manifestValue);
    validateArchiveEntryNames(
        manifest,
        entries.map((entry) => entry.name),
    );

    const payloadPath = manifest.payloads[0].path;
    const encryptedPayload = entries.find((entry) => entry.name === payloadPath);
    if (encryptedPayload === undefined) {
        throw new EntryCommitmentError(
            'payload_length_mismatch',
            payloadPath,
            'The encrypted payload entry is missing.',
        );
    }

    await validatePayloadEntryCommitment(manifest, encryptedPayload.bytes, provider);
    return manifest;
}

function defaultDigestProvider(): DigestProvider {
    if (globalThis.crypto?.subtle === undefined) {
        throw new EntryCommitmentError(
            'cryptography_unavailable',
            '',
            'Web Cryptography is not available in this runtime.',
        );
    }

    return globalThis.crypto.subtle;
}

function asArrayBuffer(value: Uint8Array): ArrayBuffer {
    return value.slice().buffer;
}
