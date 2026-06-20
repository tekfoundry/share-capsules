import {
    PayloadEncryptionError,
    canonicalizePayloadAssociatedData,
    decryptAes256Gcm,
    decryptPayloadV1,
    encryptAes256Gcm,
    encryptPayloadV1,
    generatePayloadContentKey,
    generatePayloadNonce,
    payloadEncryptionContextFromManifest,
    type PayloadEncryptionContextV1,
} from '@sharecapsules/capsule-core';
import { describe, expect, it } from 'vitest';

import { validManifestV1 } from './manifest-v1.js';

const ZERO_AES_256_KEY = new Uint8Array(32);
const ZERO_GCM_NONCE = new Uint8Array(12);
const NIST_EMPTY_PLAINTEXT_TAG = '530f8afbc74536b9a963b4f1c4cb738b';

describe('Capsule payload encryption V1', () => {
    it('locks the exact canonical authenticated context derived from the signed manifest', () => {
        const context = payloadEncryptionContextFromManifest(validManifestV1);

        expect(new TextDecoder().decode(canonicalizePayloadAssociatedData(context))).toBe(
            '{"capsule":{"id":"urn:uuid:018f4c3a-7b9d-4f2a-8c61-7a6e84e5a913","revision":1},"content_profile":{"id":"ctx.content.static-image","version":"1.0"},"cryptographic_suite":"ctx-capsule-v1","payload":{"id":"primary","media_type":"image/png","path":"payloads/primary.enc","plaintext_size":1024},"type":"ctx-capsule-payload-aad","version":"1.0"}',
        );
    });

    it('returns an immutable context so callers cannot alter authenticated fields in place', () => {
        const context = payloadEncryptionContextFromManifest(validManifestV1);

        expect(Object.isFrozen(context)).toBe(true);
        expect(Object.isFrozen(context.capsule)).toBe(true);
        expect(Object.isFrozen(context.content_profile)).toBe(true);
        expect(Object.isFrozen(context.payload)).toBe(true);
    });

    it('matches the NIST AES-256-GCM empty-plaintext and empty-AAD vector', async () => {
        const ciphertext = await encryptAes256Gcm(
            new Uint8Array(),
            ZERO_AES_256_KEY,
            ZERO_GCM_NONCE,
            new Uint8Array(),
        );

        expect(toHex(ciphertext)).toBe(NIST_EMPTY_PLAINTEXT_TAG);
        await expect(
            decryptAes256Gcm(ciphertext, ZERO_AES_256_KEY, ZERO_GCM_NONCE, new Uint8Array()),
        ).resolves.toEqual(new Uint8Array());
    });

    it('encrypts and decrypts one whole payload with a trailing 16-byte tag', async () => {
        const context = payloadEncryptionContextFromManifest(validManifestV1);
        const plaintext = referencePlaintext(context.payload.plaintext_size);
        const contentKey = sequence(32, 1);
        const nonce = sequence(12, 101);

        const encrypted = await encryptPayloadV1(plaintext, contentKey, nonce, context);

        expect(encrypted.ciphertext.byteLength).toBe(plaintext.byteLength + 16);
        expect(encrypted.nonce).toEqual(nonce);
        expect(encrypted.nonce).not.toBe(nonce);
        expect(encrypted.associatedData).toEqual(canonicalizePayloadAssociatedData(context));
        await expect(
            decryptPayloadV1(encrypted.ciphertext, contentKey, nonce, context),
        ).resolves.toEqual(plaintext);
    });

    it('is deterministic only when key, nonce, plaintext, and authenticated context are all reused', async () => {
        const context = payloadEncryptionContextFromManifest(validManifestV1);
        const plaintext = referencePlaintext(context.payload.plaintext_size);
        const contentKey = sequence(32, 1);
        const nonce = sequence(12, 101);

        const first = await encryptPayloadV1(plaintext, contentKey, nonce, context);
        const repeated = await encryptPayloadV1(plaintext, contentKey, nonce, context);

        expect(repeated.ciphertext).toEqual(first.ciphertext);
        await expect(
            encryptPayloadV1(plaintext, sequence(32, 2), nonce, context),
        ).resolves.not.toMatchObject({ ciphertext: first.ciphertext });
        await expect(
            encryptPayloadV1(plaintext, contentKey, sequence(12, 102), context),
        ).resolves.not.toMatchObject({ ciphertext: first.ciphertext });
    });

    it.each([
        [
            'Capsule identity',
            (context: MutableContext) => {
                context.capsule.id = alternateCapsuleId();
            },
        ],
        [
            'Capsule revision',
            (context: MutableContext) => {
                context.capsule.revision = 2;
            },
        ],
        [
            'suite',
            (context: MutableContext) => {
                context.cryptographic_suite = 'ctx-capsule-v0';
            },
        ],
        [
            'profile',
            (context: MutableContext) => {
                context.content_profile.version = '2.0';
            },
        ],
        [
            'payload ID',
            (context: MutableContext) => {
                context.payload.id = 'alternate';
            },
        ],
        [
            'payload path',
            (context: MutableContext) => {
                context.payload.path = 'payloads/alternate.enc';
            },
        ],
        [
            'media type',
            (context: MutableContext) => {
                context.payload.media_type = 'image/jpeg';
            },
        ],
        [
            'plaintext size',
            (context: MutableContext) => {
                context.payload.plaintext_size = 1023;
            },
        ],
    ] as const)('authenticates the %s binding', async (_, mutate) => {
        const context = payloadEncryptionContextFromManifest(validManifestV1);
        const plaintext = referencePlaintext(context.payload.plaintext_size);
        const contentKey = sequence(32, 1);
        const nonce = sequence(12, 101);
        const encrypted = await encryptPayloadV1(plaintext, contentKey, nonce, context);
        const changed = structuredClone(context) as MutableContext;
        mutate(changed);

        await expect(
            decryptAes256Gcm(
                encrypted.ciphertext,
                contentKey,
                nonce,
                canonicalizePayloadAssociatedData(changed as PayloadEncryptionContextV1),
            ),
        ).rejects.toMatchObject({ code: 'authentication_failed' });
    });

    it('fails authentication after ciphertext or tag tampering and returns no plaintext', async () => {
        const context = payloadEncryptionContextFromManifest(validManifestV1);
        const plaintext = referencePlaintext(context.payload.plaintext_size);
        const contentKey = sequence(32, 1);
        const nonce = sequence(12, 101);
        const encrypted = await encryptPayloadV1(plaintext, contentKey, nonce, context);

        for (const index of [0, encrypted.ciphertext.length - 1]) {
            const tampered = encrypted.ciphertext.slice();
            tampered[index] = (tampered[index] ?? 0) ^ 1;

            await expect(
                decryptPayloadV1(tampered, contentKey, nonce, context),
            ).rejects.toMatchObject({ code: 'authentication_failed' });
        }
    });

    it('fails authentication with the wrong content key or nonce', async () => {
        const context = payloadEncryptionContextFromManifest(validManifestV1);
        const plaintext = referencePlaintext(context.payload.plaintext_size);
        const contentKey = sequence(32, 1);
        const nonce = sequence(12, 101);
        const encrypted = await encryptPayloadV1(plaintext, contentKey, nonce, context);

        await expect(
            decryptPayloadV1(encrypted.ciphertext, sequence(32, 2), nonce, context),
        ).rejects.toMatchObject({ code: 'authentication_failed' });
        await expect(
            decryptPayloadV1(encrypted.ciphertext, contentKey, sequence(12, 102), context),
        ).rejects.toMatchObject({ code: 'authentication_failed' });
    });

    it.each([
        ['31-byte key', sequence(31, 1), ZERO_GCM_NONCE, 'invalid_content_key'],
        ['33-byte key', sequence(33, 1), ZERO_GCM_NONCE, 'invalid_content_key'],
        ['11-byte nonce', ZERO_AES_256_KEY, sequence(11, 1), 'invalid_nonce'],
        ['13-byte nonce', ZERO_AES_256_KEY, sequence(13, 1), 'invalid_nonce'],
    ] as const)('rejects an invalid %s', async (_, key, nonce, code) => {
        await expect(
            encryptAes256Gcm(new Uint8Array(), key, nonce, new Uint8Array()),
        ).rejects.toMatchObject({ code });
    });

    it('rejects plaintext and ciphertext lengths that contradict the signed context', async () => {
        const context = payloadEncryptionContextFromManifest(validManifestV1);
        const contentKey = sequence(32, 1);
        const nonce = sequence(12, 101);

        await expect(
            encryptPayloadV1(new Uint8Array(1023), contentKey, nonce, context),
        ).rejects.toMatchObject({ code: 'plaintext_size_mismatch' });
        await expect(
            decryptPayloadV1(new Uint8Array(1039), contentKey, nonce, context),
        ).rejects.toMatchObject({ code: 'invalid_ciphertext_length' });
    });

    it('creates fresh key and nonce buffers through the supplied secure-random boundary', () => {
        let invocation = 0;
        const fill = (target: Uint8Array): void => {
            invocation += 1;
            target.fill(invocation);
        };

        const firstKey = generatePayloadContentKey(fill);
        const nonce = generatePayloadNonce(fill);
        const secondKey = generatePayloadContentKey(fill);

        expect(firstKey).toEqual(new Uint8Array(32).fill(1));
        expect(nonce).toEqual(new Uint8Array(12).fill(2));
        expect(secondKey).toEqual(new Uint8Array(32).fill(3));
        expect(firstKey).not.toBe(secondKey);
    });

    it('uses structured, non-secret-bearing encryption failures', () => {
        const error = new PayloadEncryptionError('authentication_failed', 'Payload failed.');

        expect(error).toMatchObject({
            name: 'PayloadEncryptionError',
            code: 'authentication_failed',
            message: 'Payload failed.',
        });
    });
});

interface MutableContext {
    type: string;
    version: string;
    cryptographic_suite: string;
    capsule: { id: string; revision: number };
    content_profile: { id: string; version: string };
    payload: { id: string; path: string; media_type: string; plaintext_size: number };
}

function referencePlaintext(length: number): Uint8Array {
    return Uint8Array.from({ length }, (_, index) => index % 251);
}

function sequence(length: number, start: number): Uint8Array {
    return Uint8Array.from({ length }, (_, index) => (start + index) % 256);
}

function alternateCapsuleId(): string {
    return 'urn:uuid:128f4c3a-7b9d-4f2a-8c61-7a6e84e5a913';
}

function toHex(value: Uint8Array): string {
    return [...value].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
