import { decodeBase64Url, encodeBase64Url } from '@sharecapsules/capsule-core';
import { describe, expect, it } from 'vitest';

import {
    type OkpPublicJwk,
    type StoredViewerDeviceKeys,
    type ViewerDeviceChallenge,
    type ViewerDeviceKeyStore,
    ViewerDeviceRegistrar,
    ViewerDeviceRegistrationError,
    type ViewerDeviceRegistrationResult,
    type ViewerDeviceRegistrationTransport,
    okpJwkThumbprint,
    viewerDeviceRegistrationMessage,
} from './viewer-device.js';

class RecordingKeyStore implements ViewerDeviceKeyStore {
    public saved?: StoredViewerDeviceKeys;

    public async save(keys: StoredViewerDeviceKeys): Promise<void> {
        this.saved = keys;
    }

    public async load(deviceId: string): Promise<StoredViewerDeviceKeys | undefined> {
        return this.saved?.deviceId === deviceId ? this.saved : undefined;
    }

    public async remove(deviceId: string): Promise<void> {
        if (this.saved?.deviceId === deviceId) this.saved = undefined;
    }
}

class VerifyingRegistrationTransport implements ViewerDeviceRegistrationTransport {
    public challenge?: ViewerDeviceChallenge;
    public proofKey?: OkpPublicJwk;
    public agreementKey?: OkpPublicJwk;
    private serverAgreement?: CryptoKeyPair;

    public async createChallenge(
        accessToken: string,
        deviceId: string,
        proofKey: OkpPublicJwk,
        agreementKey: OkpPublicJwk,
    ): Promise<ViewerDeviceChallenge> {
        expect(accessToken).toBe('oauth-access-token');
        this.proofKey = proofKey;
        this.agreementKey = agreementKey;
        const serverAgreement = await crypto.subtle.generateKey({ name: 'X25519' }, true, [
            'deriveBits',
        ]);
        expect('privateKey' in serverAgreement).toBe(true);
        if (!('privateKey' in serverAgreement)) throw new Error('Expected key pair');
        this.serverAgreement = serverAgreement;
        const serverPublic = await crypto.subtle.exportKey('jwk', serverAgreement.publicKey);

        this.challenge = {
            type: 'ctx-viewer-device-registration',
            version: '1.0',
            challengeId: '01977ac8-793e-72d4-a234-bd581e773e7d',
            deviceId,
            nonce: encodeBase64Url(new Uint8Array(32).fill(7)),
            proofJkt: await okpJwkThumbprint(proofKey),
            agreementJkt: await okpJwkThumbprint(agreementKey),
            serverAgreementPublicKey: serverPublic.x ?? '',
            expiresAt: '2030-01-01T00:00:00.000Z',
        };

        return this.challenge;
    }

    public async register(
        accessToken: string,
        input: {
            readonly challengeId: string;
            readonly name: string;
            readonly proofSignature: string;
            readonly agreementConfirmation: string;
        },
    ): Promise<ViewerDeviceRegistrationResult> {
        expect(accessToken).toBe('oauth-access-token');
        expect(input.challengeId).toBe(this.challenge?.challengeId);
        if (!this.challenge || !this.proofKey || !this.agreementKey || !this.serverAgreement) {
            throw new Error('Challenge was not created');
        }
        const message = new TextEncoder().encode(viewerDeviceRegistrationMessage(this.challenge));
        const proofPublic = await crypto.subtle.importKey(
            'jwk',
            this.proofKey,
            { name: 'Ed25519' },
            false,
            ['verify'],
        );
        await expect(
            crypto.subtle.verify(
                'Ed25519',
                proofPublic,
                toArrayBuffer(decodeBase64Url(input.proofSignature)),
                message,
            ),
        ).resolves.toBe(true);

        const agreementPublic = await crypto.subtle.importKey(
            'jwk',
            this.agreementKey,
            { name: 'X25519' },
            false,
            [],
        );
        const sharedSecret = await crypto.subtle.deriveBits(
            { name: 'X25519', public: agreementPublic },
            this.serverAgreement.privateKey,
            256,
        );
        const hkdf = await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, [
            'deriveKey',
        ]);
        const confirmationKey = await crypto.subtle.deriveKey(
            {
                name: 'HKDF',
                hash: 'SHA-256',
                salt: toArrayBuffer(decodeBase64Url(this.challenge.nonce)),
                info: new TextEncoder().encode('ctx-viewer-device-registration-agreement-v1'),
            },
            hkdf,
            { name: 'HMAC', hash: 'SHA-256', length: 256 },
            false,
            ['verify'],
        );
        await expect(
            crypto.subtle.verify(
                'HMAC',
                confirmationKey,
                toArrayBuffer(decodeBase64Url(input.agreementConfirmation)),
                message,
            ),
        ).resolves.toBe(true);

        return {
            id: this.challenge.deviceId,
            name: input.name,
            status: 'active',
            proofJkt: this.challenge.proofJkt,
            agreementJkt: this.challenge.agreementJkt,
            createdAt: '2026-06-21T00:00:00.000Z',
        };
    }
}

describe('Viewer device registration', () => {
    it('generates separate non-exportable keys and proves possession of both', async () => {
        const transport = new VerifyingRegistrationTransport();
        const keyStore = new RecordingKeyStore();

        const device = await new ViewerDeviceRegistrar(transport, keyStore).register(
            'Personal MacBook',
            'oauth-access-token',
        );

        expect(device.status).toBe('active');
        expect(keyStore.saved?.deviceId).toBe(device.id);
        expect(keyStore.saved?.proofPublicKey).toEqual(transport.proofKey);
        expect(keyStore.saved?.agreementPublicKey).toEqual(transport.agreementKey);
        expect(keyStore.saved?.proofPublicKey.x).not.toBe(keyStore.saved?.agreementPublicKey.x);
        expect(keyStore.saved?.proofPrivateKey.extractable).toBe(false);
        expect(keyStore.saved?.agreementPrivateKey.extractable).toBe(false);
        await expect(
            crypto.subtle.exportKey('pkcs8', requireSaved(keyStore).proofPrivateKey),
        ).rejects.toThrow();
        await expect(
            crypto.subtle.exportKey('pkcs8', requireSaved(keyStore).agreementPrivateKey),
        ).rejects.toThrow();
    });

    it('refuses a challenge bound to any other proof-key thumbprint', async () => {
        const transport = new VerifyingRegistrationTransport();
        const original = transport.createChallenge.bind(transport);
        transport.createChallenge = async (...parameters) => ({
            ...(await original(...parameters)),
            proofJkt: encodeBase64Url(new Uint8Array(32).fill(9)),
        });

        await expect(
            new ViewerDeviceRegistrar(transport, new RecordingKeyStore()).register(
                'Device',
                'oauth-access-token',
            ),
        ).rejects.toEqual(new ViewerDeviceRegistrationError('challenge_mismatch'));
    });

    it('computes RFC 7638 thumbprints from only the required public members', async () => {
        await expect(
            okpJwkThumbprint({
                kty: 'OKP',
                crv: 'Ed25519',
                x: '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo',
            }),
        ).resolves.toBe('kPrK_qmxVWaYVA9wwBF6Iuo3vVzz7TxHCTwXBygrS4k');

        expect(
            viewerDeviceRegistrationMessage({
                type: 'ctx-viewer-device-registration',
                version: '1.0',
                challengeId: '01977ac8-793e-72d4-a234-bd581e773e7d',
                deviceId: '01977ac8-793e-72d4-a234-bd581e773e7e',
                nonce: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                proofJkt: 'kPrK_qmxVWaYVA9wwBF6Iuo3vVzz7TxHCTwXBygrS4k',
                agreementJkt: 'fvqyZUNdQpfZszVNMPPY5XYOUrc7YWHrq6afZ0Lba58',
                serverAgreementPublicKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                expiresAt: '2030-01-01T00:00:00.000Z',
            }),
        ).toBe(
            'ctx-viewer-device-registration\n1.0\nchallenge_id:01977ac8-793e-72d4-a234-bd581e773e7d\ndevice_id:01977ac8-793e-72d4-a234-bd581e773e7e\nnonce:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nproof_jkt:kPrK_qmxVWaYVA9wwBF6Iuo3vVzz7TxHCTwXBygrS4k\nagreement_jkt:fvqyZUNdQpfZszVNMPPY5XYOUrc7YWHrq6afZ0Lba58\n',
        );
    });
});

function requireSaved(store: RecordingKeyStore): StoredViewerDeviceKeys {
    if (!store.saved) throw new Error('Keys were not saved');
    return store.saved;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
}
