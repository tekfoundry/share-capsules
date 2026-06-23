import { ctxPolicySha256, encodeBase64Url, sha256Base64Url } from '@sharecapsules/capsule-core';
import { describe, expect, it } from 'vitest';

import {
    CreatorBrokerRegistrationClient,
    CreatorBrokerRegistrationError,
    createBrokerRegistrationId,
    type CreatorResourceProofFactory,
    type JsonPostResponse,
    type JsonPostTransport,
} from './creator-broker-registration.js';
import { CreatorPayloadSecretsFactory } from './creator-payload-secrets.js';
import type { OAuthTokenSet } from './oauth.js';
import type { StoredViewerDeviceKeys } from './viewer-device.js';

const GRANT_ENDPOINT = 'https://share.example/api/broker-registration-grants';
const BROKER = 'https://broker.example';
const REGISTRATION_ID = 'registration_00000000000040008000000000000001';
const CAPSULE_ID = 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703';
const GRANT = encodeBase64Url(new Uint8Array(32).fill(5));
const RELEASE_HANDLE = encodeBase64Url(new Uint8Array(32).fill(6));
const POLICY = {
    type: 'ctx-policy' as const,
    version: 1 as const,
    combiner: 'all' as const,
    requirements: [
        { predicate: 'ctx.account.email-verified' as const, equals: true as const },
        { predicate: 'ctx.account.active' as const, equals: true as const },
        { predicate: 'ctx.viewer.device-registered' as const, equals: true as const },
        { predicate: 'ctx.consent.capsule-view-event' as const, equals: true as const },
    ],
};
const POLICY_DIGEST = await ctxPolicySha256(POLICY);

describe('creator broker registration', () => {
    it('sends only a key digest to Laravel and sends the raw key directly to the broker', async () => {
        const transport = new RecordingTransport();
        const proof = new RecordingProofFactory();
        const client = clientUsing(transport, proof);
        const secrets = new CreatorPayloadSecretsFactory((target) => target.fill(7)).create();

        const result = await client.register(input(), secrets, token(), await device());

        expect(result).toEqual({
            broker: BROKER,
            releaseHandle: RELEASE_HANDLE,
            registrationId: REGISTRATION_ID,
        });
        expect(transport.calls).toHaveLength(2);
        const grantCall = transport.calls[0];
        const brokerCall = transport.calls[1];
        expect(grantCall).toMatchObject({
            endpoint: GRANT_ENDPOINT,
            headers: { Authorization: 'DPoP access-token', DPoP: 'proof.jwt' },
            body: {
                registration_id: REGISTRATION_ID,
                capsule_id: CAPSULE_ID,
                capsule_revision: 1,
                payload_id: 'primary',
                policy_sha256: POLICY_DIGEST,
                policy: POLICY,
                title: 'Protected image',
                content_profile_id: 'ctx.content.static-image',
                content_profile_version: '1.0',
                media_type: 'image/png',
            },
        });
        expect(grantCall?.body).not.toHaveProperty('content_key');
        expect(grantCall?.body).toHaveProperty(
            'content_key_sha256',
            await sha256Base64Url(new Uint8Array(32).fill(7)),
        );
        expect(brokerCall).toMatchObject({
            endpoint: `${BROKER}/registrations`,
            headers: {},
            body: {
                type: 'broker-key-registration',
                version: 1,
                grant: GRANT,
                registration_id: REGISTRATION_ID,
                capsule_id: CAPSULE_ID,
                payload_id: 'primary',
                content_key: encodeBase64Url(new Uint8Array(32).fill(7)),
            },
        });
        expect(proof.calls).toEqual([{ endpoint: GRANT_ENDPOINT, accessToken: 'access-token' }]);
    });

    it('accepts the broker idempotent response without changing the registration identity', async () => {
        const transport = new RecordingTransport();
        transport.registrationStatus = 200;
        const result = await clientUsing(transport).register(
            input(),
            new CreatorPayloadSecretsFactory((target) => target.fill(8)).create(),
            token(),
            await device(),
        );

        expect(result.registrationId).toBe(REGISTRATION_ID);
        expect(result.releaseHandle).toBe(RELEASE_HANDLE);
    });

    it('finalizes and cancels through exact sender-constrained lifecycle calls', async () => {
        const transport = new RecordingTransport();
        const proof = new RecordingProofFactory();
        const client = clientUsing(transport, proof);
        const registration = {
            broker: BROKER,
            releaseHandle: RELEASE_HANDLE,
            registrationId: REGISTRATION_ID,
        };

        await client.finalize(registration, token(), await device());
        await client.cancel(registration, token(), await device());

        expect(transport.calls).toHaveLength(2);
        expect(transport.calls[0]).toMatchObject({
            endpoint: `https://share.example/api/capsule-registrations/${REGISTRATION_ID}/finalize`,
            body: { release_handle: RELEASE_HANDLE },
            headers: { Authorization: 'DPoP access-token', DPoP: 'proof.jwt' },
        });
        expect(transport.calls[1]).toMatchObject({
            endpoint: `https://share.example/api/capsule-registrations/${REGISTRATION_ID}/cancel`,
            body: {},
        });
    });

    it.each([
        ['unknown grant field', { unexpected: true }, 'invalid_grant_response'],
        ['wrong broker', { broker: 'https://other.example' }, 'invalid_grant_response'],
        ['wrong grant lifetime', { expires_in: 30 }, 'invalid_grant_response'],
    ] as const)('rejects %s', async (_, grantChanges, code) => {
        const transport = new RecordingTransport();
        transport.grantChanges = grantChanges;

        await expect(
            clientUsing(transport).register(
                input(),
                new CreatorPayloadSecretsFactory((target) => target.fill(1)).create(),
                token(),
                await device(),
            ),
        ).rejects.toMatchObject({ code });
        expect(transport.calls).toHaveLength(1);
    });

    it('rejects malformed broker responses and missing no-store protection', async () => {
        const malformed = new RecordingTransport();
        malformed.registrationBody = { type: 'broker-key-registration', version: 1 };
        await expect(registerUsing(malformed)).rejects.toMatchObject({
            code: 'invalid_registration_response',
        });

        const cacheable = new RecordingTransport();
        cacheable.grantCacheControl = 'private';
        await expect(registerUsing(cacheable)).rejects.toMatchObject({
            code: 'invalid_grant_response',
        });
    });

    it('requires an exact DPoP capsule:create token before touching secrets or transport', async () => {
        const transport = new RecordingTransport();
        const secrets = new CreatorPayloadSecretsFactory((target) => target.fill(1)).create();
        for (const invalidToken of [
            { ...token(), tokenType: 'Bearer' as const },
            { ...token(), scopes: ['ctx:authorize'] },
            { ...token(), accessToken: '' },
        ]) {
            await expect(
                clientUsing(transport).register(input(), secrets, invalidToken, await device()),
            ).rejects.toMatchObject({ code: 'invalid_token' });
        }
        expect(transport.calls).toHaveLength(0);
    });

    it('fails closed for invalid bindings, unsafe endpoints, and transport failure', async () => {
        expect(
            () =>
                new CreatorBrokerRegistrationClient(
                    {
                        grantEndpoint: 'http://public.example/grants',
                        broker: BROKER,
                        lifecycleBaseEndpoint: 'https://share.example/api/capsule-registrations',
                    },
                    new RecordingTransport(),
                ),
        ).toThrow(new CreatorBrokerRegistrationError('invalid_configuration'));
        await expect(
            clientUsing(new RecordingTransport()).register(
                { ...input(), payloadId: '../private' },
                new CreatorPayloadSecretsFactory((target) => target.fill(1)).create(),
                token(),
                await device(),
            ),
        ).rejects.toMatchObject({ code: 'invalid_input' });

        const failing = new RecordingTransport();
        failing.failAt = 1;
        await expect(registerUsing(failing)).rejects.toMatchObject({ code: 'grant_failed' });
    });

    it('creates a stable manifest-compatible registration identifier', () => {
        expect(createBrokerRegistrationId(() => '00000000-0000-4000-8000-000000000001')).toBe(
            REGISTRATION_ID,
        );
    });
});

class RecordingTransport implements JsonPostTransport {
    public readonly calls: Array<{
        endpoint: string;
        body: Readonly<Record<string, unknown>>;
        headers: Readonly<Record<string, string>>;
    }> = [];
    public grantChanges: Readonly<Record<string, unknown>> = {};
    public registrationBody: unknown = {
        type: 'broker-key-registration',
        version: 1,
        release_handle: RELEASE_HANDLE,
    };
    public registrationStatus = 201;
    public grantCacheControl = 'no-store';
    public failAt?: number;

    public async post(
        endpoint: string,
        body: Readonly<Record<string, unknown>>,
        headers: Readonly<Record<string, string>> = {},
    ): Promise<JsonPostResponse> {
        this.calls.push({ endpoint, body: structuredClone(body), headers });
        if (this.failAt === this.calls.length) throw new Error('network failed');
        if (endpoint.includes('/capsule-registrations/')) {
            const status = endpoint.endsWith('/finalize') ? 'active' : 'destroyed';
            return {
                status: 200,
                cacheControl: 'no-store',
                body: {
                    type: 'capsule-registration',
                    version: 1,
                    registration_id: REGISTRATION_ID,
                    status,
                },
            };
        }
        if (this.calls.length === 1) {
            return {
                status: 201,
                cacheControl: this.grantCacheControl,
                body: {
                    type: 'broker-registration-grant',
                    version: 1,
                    grant: GRANT,
                    expires_in: 60,
                    broker: BROKER,
                    ...this.grantChanges,
                },
            };
        }

        return {
            status: this.registrationStatus,
            cacheControl: 'no-store',
            body: this.registrationBody,
        };
    }
}

class RecordingProofFactory implements CreatorResourceProofFactory {
    public readonly calls: Array<{ endpoint: string; accessToken: string }> = [];

    public async createResourceProof(endpoint: string, accessToken: string): Promise<string> {
        this.calls.push({ endpoint, accessToken });
        return 'proof.jwt';
    }
}

function clientUsing(
    transport: RecordingTransport,
    proof: CreatorResourceProofFactory = new RecordingProofFactory(),
): CreatorBrokerRegistrationClient {
    return new CreatorBrokerRegistrationClient(
        {
            grantEndpoint: GRANT_ENDPOINT,
            broker: BROKER,
            lifecycleBaseEndpoint: 'https://share.example/api/capsule-registrations',
        },
        transport,
        proof,
    );
}

async function registerUsing(transport: RecordingTransport) {
    return clientUsing(transport).register(
        input(),
        new CreatorPayloadSecretsFactory((target) => target.fill(1)).create(),
        token(),
        await device(),
    );
}

function input() {
    return {
        registrationId: REGISTRATION_ID,
        capsuleId: CAPSULE_ID,
        capsuleRevision: 1,
        payloadId: 'primary',
        policySha256: POLICY_DIGEST,
        policy: POLICY,
        title: 'Protected image',
        contentProfileId: 'ctx.content.static-image',
        contentProfileVersion: '1.0',
        mediaType: 'image/png',
    };
}

function token(): OAuthTokenSet {
    return {
        accessToken: 'access-token',
        tokenType: 'DPoP',
        expiresIn: 600,
        scopes: ['capsule:create'],
    };
}

async function device(): Promise<StoredViewerDeviceKeys> {
    const proof = await crypto.subtle.generateKey('Ed25519', false, ['sign', 'verify']);
    const agreement = await crypto.subtle.generateKey('X25519', false, ['deriveBits']);
    return {
        deviceId: 'device-id',
        proofPrivateKey: proof.privateKey,
        proofPublicKey: { kty: 'OKP', crv: 'Ed25519', x: 'public' },
        agreementPrivateKey: agreement.privateKey,
        agreementPublicKey: { kty: 'OKP', crv: 'X25519', x: 'public' },
    };
}
