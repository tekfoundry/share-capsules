import { encodeBase64Url } from '@sharecapsules/capsule-core';
import { describe, expect, it } from 'vitest';

import {
    CREATOR_RECOVERY_CODE_BYTES,
    CREATOR_RECOVERY_MAX_CIPHERTEXT_BYTES,
    CREATOR_RECOVERY_NONCE_BYTES,
    CREATOR_RECOVERY_SALT_BYTES,
    CreatorSigningKeyRecoveryError,
    CreatorSigningKeyRecoveryService,
    type CreatorSigningKeyRecoveryBundleV1,
    type RecoveryRandomSource,
} from './creator-signing-key-recovery.js';
import type { CreatorSigningKeyRecord } from './creator-signing-key.js';

describe('creator signing-key recovery', () => {
    it('creates an independently randomized encrypted bundle and 256-bit recovery code', async () => {
        const randomness = new SequenceRandomSource();
        const service = new CreatorSigningKeyRecoveryService(crypto.subtle, randomness);

        const materials = await service.create(await activeKey());
        const serialized = JSON.stringify(materials.bundle);

        expect(randomness.requestedLengths).toEqual([
            CREATOR_RECOVERY_CODE_BYTES,
            CREATOR_RECOVERY_SALT_BYTES,
            CREATOR_RECOVERY_NONCE_BYTES,
        ]);
        expect(materials.recoveryCode).toMatch(/^[A-Za-z0-9_-]{43}$/u);
        expect(materials.bundle).toMatchObject({
            type: 'share-capsules-creator-key-recovery',
            version: 1,
            key: {
                id: 'creator_00000000000040008000000000000001',
                algorithm: 'Ed25519',
            },
            kdf: { algorithm: 'HKDF-SHA-256' },
            encryption: { algorithm: 'AES-256-GCM' },
        });
        expect(serialized).not.toContain('private_key');
        expect(serialized).not.toContain(materials.recoveryCode);
    });

    it('recovers the exact signing authority and verifies its public-key match', async () => {
        const service = new CreatorSigningKeyRecoveryService(
            crypto.subtle,
            new SequenceRandomSource(),
        );
        const original = await activeKey();
        const materials = await service.create(original);

        const recovered = await service.recover(
            JSON.stringify(materials.bundle),
            materials.recoveryCode,
        );
        const message = new TextEncoder().encode('recovered signing authority');
        const signature = await crypto.subtle.sign('Ed25519', recovered.privateKey, message);
        const publicKey = await crypto.subtle.importKey(
            'raw',
            decodePublicKey(original.publicKey),
            'Ed25519',
            false,
            ['verify'],
        );

        expect(recovered).toMatchObject({
            id: original.id,
            algorithm: original.algorithm,
            publicKey: original.publicKey,
            createdAt: original.createdAt,
        });
        expect(await crypto.subtle.verify('Ed25519', publicKey, signature, message)).toBe(true);
    });

    it('can create replacement recovery materials for an already confirmed active key', async () => {
        const service = new CreatorSigningKeyRecoveryService(
            crypto.subtle,
            new SequenceRandomSource(),
        );
        const key = {
            ...(await activeKey()),
            recoveryStatus: 'confirmed' as const,
            recoveryConfirmedAt: '2026-06-21T12:01:00.000Z',
        };

        const materials = await service.create(key);

        await expect(
            service.recover(materials.bundle, materials.recoveryCode),
        ).resolves.toMatchObject({
            id: key.id,
            publicKey: key.publicKey,
        });
    });

    it('fails closed for a wrong code or any authenticated bundle change', async () => {
        const service = new CreatorSigningKeyRecoveryService(
            crypto.subtle,
            new SequenceRandomSource(),
        );
        const materials = await service.create(await activeKey());
        const wrongCode = encodeBase64Url(new Uint8Array(32).fill(247));
        await expect(service.recover(materials.bundle, wrongCode)).rejects.toMatchObject({
            code: 'recovery_failed',
        });

        const tampered: CreatorSigningKeyRecoveryBundleV1 = {
            ...materials.bundle,
            key: { ...materials.bundle.key, created_at: '2026-06-22T12:00:00.000Z' },
        };
        await expect(service.recover(tampered, materials.recoveryCode)).rejects.toMatchObject({
            code: 'recovery_failed',
        });
    });

    it.each([
        [
            'unknown field',
            (bundle: CreatorSigningKeyRecoveryBundleV1) => ({ ...bundle, secret: 1 }),
        ],
        [
            'unsupported version',
            (bundle: CreatorSigningKeyRecoveryBundleV1) => ({ ...bundle, version: 2 }),
        ],
        [
            'short salt',
            (bundle: CreatorSigningKeyRecoveryBundleV1) => ({
                ...bundle,
                kdf: { ...bundle.kdf, salt: encodeBase64Url(new Uint8Array(15)) },
            }),
        ],
        [
            'private key field',
            (bundle: CreatorSigningKeyRecoveryBundleV1) => ({
                ...bundle,
                key: { ...bundle.key, private_key: 'forbidden' },
            }),
        ],
        [
            'oversized ciphertext',
            (bundle: CreatorSigningKeyRecoveryBundleV1) => ({
                ...bundle,
                ciphertext: encodeBase64Url(
                    new Uint8Array(CREATOR_RECOVERY_MAX_CIPHERTEXT_BYTES + 1),
                ),
            }),
        ],
    ])('rejects a malformed bundle with %s', async (_, mutate) => {
        const service = new CreatorSigningKeyRecoveryService(
            crypto.subtle,
            new SequenceRandomSource(),
        );
        const materials = await service.create(await activeKey());

        await expect(
            service.recover(mutate(materials.bundle), materials.recoveryCode),
        ).rejects.toEqual(new CreatorSigningKeyRecoveryError('invalid_bundle'));
    });

    it('rejects a malformed or lower-entropy recovery code before decryption', async () => {
        const service = new CreatorSigningKeyRecoveryService(
            crypto.subtle,
            new SequenceRandomSource(),
        );
        const materials = await service.create(await activeKey());

        await expect(service.recover(materials.bundle, 'ordinary-password')).rejects.toEqual(
            new CreatorSigningKeyRecoveryError('invalid_recovery_code'),
        );
    });
});

async function activeKey(): Promise<CreatorSigningKeyRecord> {
    const pair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
    const publicKey = encodeBase64Url(
        new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)),
    );

    return {
        id: 'creator_00000000000040008000000000000001',
        algorithm: 'Ed25519',
        publicKey,
        privateKey: pair.privateKey,
        status: 'active',
        createdAt: '2026-06-21T12:00:00.000Z',
        statusChangedAt: '2026-06-21T12:00:00.000Z',
        recoveryStatus: 'required',
    };
}

class SequenceRandomSource implements RecoveryRandomSource {
    public readonly requestedLengths: number[] = [];
    private sequence = 0;

    public bytes(length: number): Uint8Array {
        this.requestedLengths.push(length);
        return new Uint8Array(length).fill(++this.sequence);
    }
}

function decodePublicKey(value: string): ArrayBuffer {
    const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
    const binary = atob(base64.padEnd(44, '='));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
}
