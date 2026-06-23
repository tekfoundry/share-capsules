import { decodeBase64Url } from '@sharecapsules/capsule-core';
import { importCtxX25519PublicKey, sealCtxContentKeyV1 } from '@sharecapsules/ctx-client';
import type { CtxTicketClaimsV1 } from '@sharecapsules/ctx-client';
import { cryptographicVectorsV1 as vectors } from '@sharecapsules/test-fixtures';
import { describe, expect, it } from 'vitest';

import { openViewerContentKey } from './viewer-hpke.js';
import type { StoredViewerDeviceKeys } from './viewer-device.js';

describe('Viewer HPKE opener', () => {
    it('opens a V1 HPKE key release for a browser-native Viewer agreement key', async () => {
        const hpke = vectors.hpke_key_release;
        const claims = vectors.ticket.claims as CtxTicketClaimsV1;
        const agreement = await crypto.subtle.generateKey({ name: 'X25519' }, false, [
            'deriveBits',
        ]);
        if (!('privateKey' in agreement)) throw new Error('Expected X25519 key pair.');
        const agreementPublic = (await crypto.subtle.exportKey('jwk', agreement.publicKey)) as {
            readonly x: string;
        };
        const sealed = await sealCtxContentKeyV1(
            fromHex(hpke.content_key_hex),
            await importCtxX25519PublicKey(decodeBase64Url(agreementPublic.x)),
            fromHex(hpke.info_hex),
            fromHex(hpke.aad_hex),
            fromHex(hpke.ephemeral_ikm_hex),
        );
        const contentKey = await openViewerContentKey(
            sealed.enc,
            sealed.ciphertext,
            {
                deviceId: 'device-1',
                proofPrivateKey: {} as CryptoKey,
                proofPublicKey: { kty: 'OKP', crv: 'Ed25519', x: claims.ctx.proof_jkt },
                agreementPrivateKey: agreement.privateKey,
                agreementPublicKey: {
                    kty: 'OKP',
                    crv: 'X25519',
                    x: agreementPublic.x,
                },
            } satisfies StoredViewerDeviceKeys,
            claims,
            vectors.ticket.compact,
        );

        expect(toHex(contentKey)).toBe(hpke.content_key_hex);
    });

    it('rejects changed key-release ciphertext', async () => {
        const hpke = vectors.hpke_key_release;
        const claims = vectors.ticket.claims as CtxTicketClaimsV1;
        const agreement = await crypto.subtle.generateKey({ name: 'X25519' }, false, [
            'deriveBits',
        ]);
        if (!('privateKey' in agreement)) throw new Error('Expected X25519 key pair.');
        const agreementPublic = (await crypto.subtle.exportKey('jwk', agreement.publicKey)) as {
            readonly x: string;
        };
        const sealed = await sealCtxContentKeyV1(
            fromHex(hpke.content_key_hex),
            await importCtxX25519PublicKey(decodeBase64Url(agreementPublic.x)),
            fromHex(hpke.info_hex),
            fromHex(hpke.aad_hex),
            fromHex(hpke.ephemeral_ikm_hex),
        );
        const ciphertext = sealed.ciphertext.slice();
        ciphertext[0] = (ciphertext[0] ?? 0) ^ 0xff;

        await expect(
            openViewerContentKey(
                sealed.enc,
                ciphertext,
                {
                    deviceId: 'device-1',
                    proofPrivateKey: {} as CryptoKey,
                    proofPublicKey: { kty: 'OKP', crv: 'Ed25519', x: claims.ctx.proof_jkt },
                    agreementPrivateKey: agreement.privateKey,
                    agreementPublicKey: {
                        kty: 'OKP',
                        crv: 'X25519',
                        x: agreementPublic.x,
                    },
                } satisfies StoredViewerDeviceKeys,
                claims,
                vectors.ticket.compact,
            ),
        ).rejects.toThrow('The broker key release could not be unwrapped.');
    });
});

function fromHex(value: string): Uint8Array {
    return decodeBase64Url(Buffer.from(value, 'hex').toString('base64url'));
}

function toHex(value: Uint8Array): string {
    return Buffer.from(value).toString('hex');
}
