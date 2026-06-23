import {
    assembleCapsuleZipV1,
    ctxPolicySha256,
    encodeBase64Url,
    sha256Base64Url,
    signCapsuleManifest,
} from '@sharecapsules/capsule-core';
import { validManifestV1 } from '@sharecapsules/test-fixtures';
import { describe, expect, it } from 'vitest';

import { verifyFetchedViewerCapsule } from './viewer-capsule-verifier.js';

describe('Viewer Capsule verifier', () => {
    it('verifies the fetched archive, signed manifest, policy, profile, entry commitment, and provider identities', async () => {
        const fixture = await capsuleFixture();

        const result = await verifyFetchedViewerCapsule(fixture.archive, {
            acceptedCtxIssuers: [fixture.manifest.ctx.issuer],
            acceptedBrokers: [fixture.manifest.payloads[0].key_release.broker],
        });

        expect(result).toEqual({
            ok: true,
            summary: {
                capsuleId: fixture.manifest.capsule.id,
                capsuleRevision: fixture.manifest.capsule.revision,
                title: fixture.manifest.description?.title,
                description: fixture.manifest.description?.description,
                contentProfileId: 'ctx.content.static-image',
                contentProfileVersion: '1.0',
                mediaType: 'image/png',
                payloadId: 'primary',
                payloadPath: 'payloads/primary.enc',
                payloadPlaintextBytes: fixture.manifest.payloads[0].plaintext_size,
                payloadNonce: expect.any(Uint8Array),
                payloadEncryptionContext: expect.objectContaining({
                    payload: expect.objectContaining({
                        id: 'primary',
                        media_type: 'image/png',
                    }),
                }),
                profileMetadata: {
                    width: fixture.manifest.payloads[0].profile_metadata.width,
                    height: fixture.manifest.payloads[0].profile_metadata.height,
                    pixelCount: fixture.manifest.payloads[0].profile_metadata.pixel_count,
                },
                ctxIssuer: fixture.manifest.ctx.issuer,
                policy: fixture.manifest.policy,
                policySha256: await ctxPolicySha256(fixture.manifest.policy),
                broker: fixture.manifest.payloads[0].key_release.broker,
                releaseHandle: fixture.manifest.payloads[0].key_release.handle,
                ciphertextBytes: fixture.payload.byteLength,
            },
            encryptedPayload: fixture.payload,
        });
    });

    it('rejects invalid signatures before returning any verified summary', async () => {
        const fixture = await capsuleFixture();
        const invalidSignature = fixture.signature.slice();
        invalidSignature[0] = invalidSignature[0]! ^ 1;

        await expect(
            verifyFetchedViewerCapsule(
                await assembleCapsuleZipV1(fixture.manifest, invalidSignature, fixture.payload),
            ),
        ).resolves.toEqual({ ok: false, code: 'invalid_signature' });
    });

    it('rejects Capsules whose signed provider identities are not locally accepted', async () => {
        const fixture = await capsuleFixture();

        await expect(
            verifyFetchedViewerCapsule(fixture.archive, {
                acceptedCtxIssuers: ['https://different-trust.example'],
                acceptedBrokers: [fixture.manifest.payloads[0].key_release.broker],
            }),
        ).resolves.toEqual({ ok: false, code: 'untrusted_ctx_issuer' });

        await expect(
            verifyFetchedViewerCapsule(fixture.archive, {
                acceptedCtxIssuers: [fixture.manifest.ctx.issuer],
                acceptedBrokers: ['https://different-broker.example'],
            }),
        ).resolves.toEqual({ ok: false, code: 'untrusted_broker' });
    });

    it('rejects archives whose encrypted payload no longer matches the signed commitment', async () => {
        const fixture = await capsuleFixture();
        const changed = fixture.archive.slice();
        const payloadOffset = findBytes(changed, fixture.payload);
        changed[payloadOffset] = changed[payloadOffset]! ^ 1;

        await expect(verifyFetchedViewerCapsule(changed)).resolves.toEqual({
            ok: false,
            code: 'invalid_archive',
        });
    });
});

async function capsuleFixture() {
    const payload = Uint8Array.from({ length: 48 }, (_, index) => index);
    const signingKeys = (await crypto.subtle.generateKey('Ed25519', true, [
        'sign',
        'verify',
    ])) as CryptoKeyPair;
    const manifest = structuredClone(validManifestV1);
    manifest.creator.signing_key.public_key = encodeBase64Url(
        new Uint8Array(await crypto.subtle.exportKey('raw', signingKeys.publicKey)),
    );
    manifest.payloads[0].media_type = 'image/png';
    manifest.payloads[0].plaintext_size = payload.byteLength - 16;
    manifest.payloads[0].ciphertext_size = payload.byteLength;
    manifest.payloads[0].ciphertext_sha256 = await sha256Base64Url(payload);
    const signature = await signCapsuleManifest(manifest, signingKeys);
    const archive = await assembleCapsuleZipV1(manifest, signature, payload);
    return { archive, manifest, payload, signature };
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
