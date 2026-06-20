import {
    EntryCommitmentError,
    ManifestValidationError,
    canonicalManifestSha256,
    canonicalizeCapsuleManifest,
    parseCapsuleManifest,
    sha256,
    sha256Base64Url,
    validateCapsuleEntryCommitments,
    validatePayloadEntryCommitment,
    type DigestProvider,
} from '@sharecapsules/capsule-core';
import { describe, expect, it } from 'vitest';

import { validManifestV1 } from './manifest-v1.js';

describe('Capsule SHA-256 entry commitments', () => {
    it('matches the FIPS 180-4 SHA-256 vector for abc', async () => {
        const input = new TextEncoder().encode('abc');

        expect(toHex(await sha256(input))).toBe(
            'ba7816bf8f01cfea414140de5dae2223' + 'b00361a396177a9cb410ff61f20015ad',
        );
        await expect(sha256Base64Url(input)).resolves.toBe(
            'ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0',
        );
    });

    it('accepts an encrypted payload only when actual length and digest match the manifest', async () => {
        const payloadBytes = sequence(validManifestV1.payloads[0].ciphertext_size);
        const manifest = await manifestCommittingTo(payloadBytes);

        await expect(
            validatePayloadEntryCommitment(manifest, payloadBytes),
        ).resolves.toBeUndefined();
    });

    it('rejects a payload whose actual length differs from its signed declaration', async () => {
        const payloadBytes = sequence(validManifestV1.payloads[0].ciphertext_size);
        const manifest = await manifestCommittingTo(payloadBytes);

        await expect(
            validatePayloadEntryCommitment(manifest, payloadBytes.slice(0, -1)),
        ).rejects.toMatchObject({
            code: 'payload_length_mismatch',
            entryName: 'payloads/primary.enc',
        });
    });

    it('rejects a same-length payload after any byte changes', async () => {
        const payloadBytes = sequence(validManifestV1.payloads[0].ciphertext_size);
        const manifest = await manifestCommittingTo(payloadBytes);
        const changed = payloadBytes.slice();
        changed[changed.length - 1] = (changed[changed.length - 1] ?? 0) ^ 1;

        await expect(validatePayloadEntryCommitment(manifest, changed)).rejects.toMatchObject({
            code: 'payload_digest_mismatch',
            entryName: 'payloads/primary.enc',
        });
    });

    it('validates the complete actual archive name set before entry commitments', async () => {
        const payloadBytes = sequence(validManifestV1.payloads[0].ciphertext_size);
        const manifest = await manifestCommittingTo(payloadBytes);
        const entries = referenceEntries(manifest, payloadBytes);

        await expect(validateCapsuleEntryCommitments(manifest, entries)).resolves.toEqual(manifest);
    });

    it.each([
        ['missing', ['manifest.json', 'manifest.sig']],
        [
            'duplicate',
            ['manifest.json', 'manifest.sig', 'payloads/primary.enc', 'payloads/primary.enc'],
        ],
        [
            'undeclared',
            ['manifest.json', 'manifest.sig', 'payloads/primary.enc', 'payloads/extra.enc'],
        ],
    ] as const)('rejects a %s actual archive entry set', async (_, names) => {
        const payloadBytes = sequence(validManifestV1.payloads[0].ciphertext_size);
        const manifest = await manifestCommittingTo(payloadBytes);
        const entries = names.map((name) => ({ name, bytes: payloadBytes }));

        await expect(validateCapsuleEntryCommitments(manifest, entries)).rejects.toBeInstanceOf(
            ManifestValidationError,
        );
    });

    it('hashes canonical manifest bytes independently of object insertion order', async () => {
        const reordered = Object.fromEntries(Object.entries(validManifestV1).reverse());

        await expect(canonicalManifestSha256(reordered)).resolves.toBe(
            await canonicalManifestSha256(validManifestV1),
        );
    });

    it('changes the canonical manifest commitment when a signed value changes', async () => {
        const changed = structuredClone(validManifestV1);
        changed.description!.title = 'A different signed title';

        expect(await canonicalManifestSha256(changed)).not.toBe(
            await canonicalManifestSha256(validManifestV1),
        );
    });

    it('produces the predecessor commitment from exactly the canonical manifest bytes', async () => {
        await expect(canonicalManifestSha256(validManifestV1)).resolves.toBe(
            await sha256Base64Url(canonicalizeCapsuleManifest(validManifestV1)),
        );
    });

    it.each([
        [
            'creator public key',
            (value: MutableManifest) => {
                value.creator.signing_key.public_key = nonCanonical32Bytes();
            },
        ],
        [
            'payload digest',
            (value: MutableManifest) => {
                value.payloads[0].ciphertext_sha256 = nonCanonical32Bytes();
            },
        ],
        [
            'nonce',
            (value: MutableManifest) => {
                value.payloads[0].encryption.nonce = 'AAAAAAAAAAAAAAAA=';
            },
        ],
    ] as const)('rejects non-canonical base64url for the %s', (_, mutate) => {
        const value = structuredClone(validManifestV1) as unknown as MutableManifest;
        mutate(value);

        expect(() => parseCapsuleManifest(value)).toThrow(ManifestValidationError);
    });

    it('rejects a non-canonical predecessor manifest commitment', () => {
        const value = structuredClone(validManifestV1) as unknown as Record<string, unknown>;
        value.capsule = {
            id: 'urn:uuid:128f4c3a-7b9d-4f2a-8c61-7a6e84e5a913',
            revision: 2,
            created_at: '2026-06-20T13:00:00Z',
            predecessor: {
                id: validManifestV1.capsule.id,
                revision: 1,
                manifest_sha256: nonCanonical32Bytes(),
            },
        };

        expect(() => parseCapsuleManifest(value)).toThrow(ManifestValidationError);
    });

    it('uses structured commitment failures without exposing entry bytes', () => {
        const error = new EntryCommitmentError(
            'payload_digest_mismatch',
            'payloads/primary.enc',
            'Digest mismatch.',
        );

        expect(error).toMatchObject({
            name: 'EntryCommitmentError',
            code: 'payload_digest_mismatch',
            entryName: 'payloads/primary.enc',
            message: 'Digest mismatch.',
        });
    });

    it('maps digest-provider failure to a stable non-secret-bearing error', async () => {
        const provider = {
            digest: async () => {
                throw new Error('provider detail that must not escape');
            },
        } as unknown as DigestProvider;

        await expect(sha256(new Uint8Array(), provider)).rejects.toMatchObject({
            code: 'digest_failed',
            message: 'SHA-256 computation failed.',
        });
    });

    it('rejects a digest provider that returns a non-SHA-256 result length', async () => {
        const provider = {
            digest: async () => new ArrayBuffer(31),
        } as unknown as DigestProvider;

        await expect(sha256(new Uint8Array(), provider)).rejects.toMatchObject({
            code: 'invalid_digest_result',
        });
    });
});

interface MutableManifest {
    creator: { signing_key: { public_key: string } };
    payloads: [{ ciphertext_sha256: string; encryption: { nonce: string } }];
}

async function manifestCommittingTo(payloadBytes: Uint8Array) {
    const value = structuredClone(validManifestV1);
    value.payloads[0].ciphertext_sha256 = await sha256Base64Url(payloadBytes);
    return parseCapsuleManifest(value);
}

function referenceEntries(manifest: typeof validManifestV1, payloadBytes: Uint8Array) {
    return [
        { name: 'manifest.json', bytes: canonicalizeCapsuleManifest(manifest) },
        { name: 'manifest.sig', bytes: new Uint8Array(64) },
        { name: manifest.payloads[0].path, bytes: payloadBytes },
    ];
}

function sequence(length: number): Uint8Array {
    return Uint8Array.from({ length }, (_, index) => index % 251);
}

function nonCanonical32Bytes(): string {
    return `${'A'.repeat(42)}B`;
}

function toHex(value: Uint8Array): string {
    return [...value].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
