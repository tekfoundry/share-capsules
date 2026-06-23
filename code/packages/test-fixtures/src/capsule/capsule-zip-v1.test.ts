import {
    CapsuleZipError,
    assembleCapsuleZipV1,
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
