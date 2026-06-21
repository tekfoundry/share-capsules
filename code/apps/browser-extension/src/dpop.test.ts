import { decodeBase64Url } from '@sharecapsules/capsule-core';
import { describe, expect, it } from 'vitest';

import { DpopProofFactory } from './dpop.js';

describe('DPoP proofs', () => {
    it('binds protected requests to the exact target and access-token hash', async () => {
        const keys = await crypto.subtle.generateKey({ name: 'Ed25519' }, false, [
            'sign',
            'verify',
        ]);
        if (!('privateKey' in keys)) throw new Error('key_generation');
        const publicKey = (await crypto.subtle.exportKey('jwk', keys.publicKey)) as {
            kty: 'OKP';
            crv: 'Ed25519';
            x: string;
        };
        const proof = await new DpopProofFactory(
            crypto,
            () => 1_750_000_000_000,
        ).createResourceProof(
            'https://provider.example/ctx/authorize?ignored=true',
            'secret-access-token',
            keys.privateKey,
            publicKey,
            'server-nonce',
        );
        const [encodedHeader, encodedPayload, encodedSignature] = proof.split('.');
        const payload = JSON.parse(
            new TextDecoder().decode(decodeBase64Url(encodedPayload ?? '')),
        ) as Record<string, unknown>;
        const signature = decodeBase64Url(encodedSignature ?? '');

        expect(payload).toEqual({
            jti: expect.any(String),
            htm: 'POST',
            htu: 'https://provider.example/ctx/authorize',
            iat: 1_750_000_000,
            ath: 'WWStIsIutejwjEFBEuKGoccT25khDuqH0_Q1JKrHFsw',
            nonce: 'server-nonce',
        });
        await expect(
            crypto.subtle.verify(
                'Ed25519',
                keys.publicKey,
                Uint8Array.from(signature).buffer,
                new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
            ),
        ).resolves.toBe(true);
    });
});
