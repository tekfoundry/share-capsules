import {
    CapsuleZipError,
    assembleCapsuleZipV1,
    canonicalizeCapsuleManifest,
    encodeBase64Url,
    sha256Base64Url,
    signCapsuleManifest,
    verifyCapsuleZipV1,
} from '@sharecapsules/capsule-core';
import { describe, expect, it } from 'vitest';

import { validManifestV1 } from './manifest-v1.js';

describe('strict Capsule ZIP V1 reader and writer', () => {
    it('round-trips the exact three-entry archive entirely in memory', async () => {
        const fixture = await capsuleFixture();

        const verified = await verifyCapsuleZipV1(fixture.archive);

        expect(verified.manifest).toEqual(fixture.manifest);
        expect(verified.manifestSignature).toEqual(fixture.signature);
        expect(verified.encryptedPayload).toEqual(fixture.payload);
    });

    it('rejects any changed encrypted byte before trusting the archive', async () => {
        const fixture = await capsuleFixture();
        const changed = fixture.archive.slice();
        const payloadOffset = findBytes(changed, fixture.payload);
        changed[payloadOffset] = changed[payloadOffset]! ^ 1;

        await expect(verifyCapsuleZipV1(changed)).rejects.toMatchObject({
            code: 'invalid_entry',
        });
    });

    it('rejects a correctly packaged but invalid manifest signature', async () => {
        const fixture = await capsuleFixture();
        const invalidSignature = fixture.signature.slice();
        invalidSignature[0] = invalidSignature[0]! ^ 1;
        const archive = await assembleCapsuleZipV1(
            fixture.manifest,
            invalidSignature,
            fixture.payload,
        );

        await expect(verifyCapsuleZipV1(archive)).rejects.toEqual(
            new CapsuleZipError('invalid_signature'),
        );
    });

    it.each([
        ['ZIP comments', (archive: Uint8Array) => Uint8Array.from([...archive, 0])],
        [
            'ZIP encryption flags',
            (archive: Uint8Array) => {
                const changed = archive.slice();
                writeU16(changed, 6, 1);
                writeU16(changed, centralOffset(changed) + 8, 1);
                return changed;
            },
        ],
        [
            'compression',
            (archive: Uint8Array) => {
                const changed = archive.slice();
                writeU16(changed, 8, 8);
                writeU16(changed, centralOffset(changed) + 10, 8);
                return changed;
            },
        ],
        [
            'extra fields',
            (archive: Uint8Array) => {
                const changed = archive.slice();
                writeU16(changed, centralOffset(changed) + 30, 1);
                return changed;
            },
        ],
        ['truncation', (archive: Uint8Array) => archive.slice(0, -1)],
    ])('rejects unsupported %s', async (_, change) => {
        const fixture = await capsuleFixture();

        await expect(verifyCapsuleZipV1(change(fixture.archive))).rejects.toMatchObject({
            code: 'invalid_entry',
        });
    });

    it('rejects duplicate or undeclared names and local/central disagreement', async () => {
        const fixture = await capsuleFixture();
        const changed = fixture.archive.slice();
        const payloadName = new TextEncoder().encode('payloads/primary.enc');
        const payloadNameOffset = findBytes(changed, payloadName);
        changed[payloadNameOffset] = 'm'.charCodeAt(0);

        await expect(verifyCapsuleZipV1(changed)).rejects.toMatchObject({
            code: 'invalid_entry',
        });
    });

    it.each([
        [
            'path traversal entry names',
            async (fixture: Awaited<ReturnType<typeof capsuleFixture>>) => {
                const changed = fixture.archive.slice();
                replaceEvery(
                    changed,
                    new TextEncoder().encode('payloads/primary.enc'),
                    new TextEncoder().encode('../payload/evilx.enc'),
                );
                return changed;
            },
        ],
        [
            'declared central directory size that overlaps local data',
            async (fixture: Awaited<ReturnType<typeof capsuleFixture>>) => {
                const changed = fixture.archive.slice();
                const endOffset = changed.byteLength - 22;
                writeU32(changed, endOffset + 12, readU32(changed, endOffset + 12) + 1);
                return changed;
            },
        ],
        [
            'declared central directory offset past the archive',
            async (fixture: Awaited<ReturnType<typeof capsuleFixture>>) => {
                const changed = fixture.archive.slice();
                const endOffset = changed.byteLength - 22;
                writeU32(changed, endOffset + 16, changed.byteLength + 1);
                return changed;
            },
        ],
        [
            'non-contiguous local file offsets',
            async (fixture: Awaited<ReturnType<typeof capsuleFixture>>) => {
                const changed = fixture.archive.slice();
                writeU32(changed, centralOffset(changed) + 42, 1);
                return changed;
            },
        ],
        [
            'local and central uncompressed size mismatch',
            async (fixture: Awaited<ReturnType<typeof capsuleFixture>>) => {
                const changed = fixture.archive.slice();
                writeU32(changed, 18, readU32(changed, 18) + 1);
                return changed;
            },
        ],
        [
            'non-canonical manifest JSON bytes',
            async (fixture: Awaited<ReturnType<typeof capsuleFixture>>) => {
                const manifestBytes = canonicalizeCapsuleManifest(fixture.manifest);
                const archive = await assembleCapsuleZipV1(
                    fixture.manifest,
                    fixture.signature,
                    fixture.payload,
                );
                const canonicalOffset = findBytes(archive, manifestBytes);
                const changed = archive.slice();
                changed[canonicalOffset] = 0x20;
                return changed;
            },
        ],
        [
            'declared archive byte envelope exceeded',
            async () => new Uint8Array(27 * 1024 * 1024 + 1),
            'size_exceeded',
        ],
    ])('malicious corpus rejects %s', async (_, change, code = 'invalid_entry') => {
        const fixture = await capsuleFixture();

        await expect(verifyCapsuleZipV1(await change(fixture))).rejects.toMatchObject({ code });
    });

    it.each([0, 1, 2, 21, 22, 23, 64, 255, 1024])(
        'property-style ZIP parser rejects bounded synthetic archive length %i',
        async (length) => {
            const archive = Uint8Array.from({ length }, (_, index) => (index * 37 + 11) % 256);

            await expect(verifyCapsuleZipV1(archive)).rejects.toMatchObject({
                code: 'invalid_entry',
            });
        },
    );

    it('property-style ZIP parser fails closed on targeted valid-archive byte mutations', async () => {
        const fixture = await capsuleFixture();
        const offsets = [
            0,
            3,
            4,
            8,
            14,
            18,
            26,
            centralOffset(fixture.archive),
            centralOffset(fixture.archive) + 10,
            fixture.archive.byteLength - 22,
            fixture.archive.byteLength - 6,
        ];

        for (const offset of offsets) {
            const changed = fixture.archive.slice();
            changed[offset] = changed[offset]! ^ 0xff;

            await expect(verifyCapsuleZipV1(changed)).rejects.toMatchObject({
                code: 'invalid_entry',
            });
        }
    });
});

async function capsuleFixture() {
    const payload = Uint8Array.from({ length: 32 }, (_, index) => index);
    const signingKeys = (await crypto.subtle.generateKey('Ed25519', true, [
        'sign',
        'verify',
    ])) as CryptoKeyPair;
    const manifest = structuredClone(validManifestV1);
    manifest.creator.signing_key.public_key = encodeBase64Url(
        new Uint8Array(await crypto.subtle.exportKey('raw', signingKeys.publicKey)),
    );
    manifest.payloads[0].plaintext_size = payload.byteLength - 16;
    manifest.payloads[0].ciphertext_size = payload.byteLength;
    manifest.payloads[0].ciphertext_sha256 = await sha256Base64Url(payload);
    const signature = await signCapsuleManifest(manifest, signingKeys);
    const archive = await assembleCapsuleZipV1(manifest, signature, payload);
    return { archive, manifest, payload, signature };
}

function centralOffset(archive: Uint8Array): number {
    return readU32(archive, archive.byteLength - 6);
}

function findBytes(haystack: Uint8Array, needle: Uint8Array): number {
    outer: for (let start = 0; start <= haystack.byteLength - needle.byteLength; start++) {
        for (let index = 0; index < needle.byteLength; index++) {
            if (haystack[start + index] !== needle[index]) continue outer;
        }
        return start;
    }
    throw new Error('Test bytes not found.');
}

function readU32(value: Uint8Array, offset: number): number {
    return new DataView(value.buffer, value.byteOffset, value.byteLength).getUint32(offset, true);
}

function writeU16(value: Uint8Array, offset: number, number: number): void {
    new DataView(value.buffer, value.byteOffset, value.byteLength).setUint16(offset, number, true);
}

function writeU32(value: Uint8Array, offset: number, number: number): void {
    new DataView(value.buffer, value.byteOffset, value.byteLength).setUint32(offset, number, true);
}

function replaceEvery(value: Uint8Array, search: Uint8Array, replacement: Uint8Array): void {
    expect(replacement.byteLength).toBe(search.byteLength);
    let offset = 0;
    let replacements = 0;
    while (offset < value.byteLength) {
        const found = findBytesFrom(value, search, offset);
        if (found === -1) break;
        value.set(replacement, found);
        offset = found + replacement.byteLength;
        replacements++;
    }
    expect(replacements).toBeGreaterThan(0);
}

function findBytesFrom(haystack: Uint8Array, needle: Uint8Array, offset: number): number {
    outer: for (let start = offset; start <= haystack.byteLength - needle.byteLength; start++) {
        for (let index = 0; index < needle.byteLength; index++) {
            if (haystack[start + index] !== needle[index]) continue outer;
        }
        return start;
    }
    return -1;
}
