import { encodeBase64Url } from '@sharecapsules/capsule-core';

import type { OkpPublicJwk } from './viewer-device.js';

export class DpopProofFactory {
    public constructor(
        private readonly cryptography: Pick<Crypto, 'randomUUID' | 'subtle'> = crypto,
        private readonly now: () => number = () => Date.now(),
    ) {}

    public createTokenEndpointProof(
        tokenEndpoint: string,
        privateKey: CryptoKey,
        publicKey: OkpPublicJwk,
    ): Promise<string> {
        return this.sign(tokenEndpoint, privateKey, publicKey, {});
    }

    public async createResourceProof(
        resourceEndpoint: string,
        accessToken: string,
        privateKey: CryptoKey,
        publicKey: OkpPublicJwk,
        nonce?: string,
    ): Promise<string> {
        const tokenHash = await this.cryptography.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(accessToken),
        );

        return this.sign(resourceEndpoint, privateKey, publicKey, {
            ath: encodeBase64Url(new Uint8Array(tokenHash)),
            ...(nonce === undefined ? {} : { nonce }),
        });
    }

    private async sign(
        endpoint: string,
        privateKey: CryptoKey,
        publicKey: OkpPublicJwk,
        additionalClaims: Readonly<Record<string, string>>,
    ): Promise<string> {
        const htu = exactTarget(endpoint);
        if (publicKey.kty !== 'OKP' || publicKey.crv !== 'Ed25519') {
            throw new Error('invalid_dpop_key');
        }

        const encodedHeader = encodeJson({
            typ: 'dpop+jwt',
            alg: 'EdDSA',
            jwk: publicKey,
        });
        const encodedPayload = encodeJson({
            jti: this.cryptography.randomUUID(),
            htm: 'POST',
            htu,
            iat: Math.floor(this.now() / 1000),
            ...additionalClaims,
        });
        const signingInput = `${encodedHeader}.${encodedPayload}`;
        const signature = await this.cryptography.subtle.sign(
            'Ed25519',
            privateKey,
            new TextEncoder().encode(signingInput),
        );

        return `${signingInput}.${encodeBase64Url(new Uint8Array(signature))}`;
    }
}

function exactTarget(value: string): string {
    const url = new URL(value);
    if (
        (url.protocol !== 'https:' &&
            !(
                url.protocol === 'http:' &&
                ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
            )) ||
        url.username !== '' ||
        url.password !== '' ||
        url.hash !== ''
    ) {
        throw new Error('invalid_dpop_target');
    }
    url.search = '';

    return url.toString();
}

function encodeJson(value: unknown): string {
    return encodeBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}
