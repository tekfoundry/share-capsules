import { describe, expect, it } from 'vitest';

import type { DpopProofFactory } from './dpop.js';
import type { OAuthTokenSet } from './oauth.js';
import {
    ViewerCtxAuthorizationClient,
    type ViewerCtxAuthorizationOptions,
} from './viewer-ctx-authorization.js';
import type { VerifiedViewerCapsuleSummary } from './viewer-capsule-verifier.js';
import type { StoredViewerDeviceKeys } from './viewer-device.js';

describe('Viewer CTX authorization client', () => {
    it('requests a signed authorization ticket with the verified Capsule and consent bindings', async () => {
        const requests: { readonly url: string; readonly init: RequestInit }[] = [];
        const client = new ViewerCtxAuthorizationClient('https://trust.example/ctx/authorize', {
            dpop: proofFactory(),
            fetch: async (url, init) => {
                requests.push({ url: url.toString(), init: init ?? {} });
                return jsonResponse({
                    type: 'ctx-authorization',
                    version: 1,
                    ticket: 'header.claims.signature',
                    expires_in: 60,
                });
            },
        });

        await expect(
            client.authorize(summary(), token(['ctx:authorize']), device(), true),
        ).resolves.toEqual({
            ok: true,
            authorization: { ticket: 'header.claims.signature', expiresIn: 60 },
        });

        expect(requests).toHaveLength(1);
        expect(requests[0]?.url).toBe('https://trust.example/ctx/authorize');
        expect(requests[0]?.init).toMatchObject({
            method: 'POST',
            headers: {
                Accept: 'application/json',
                Authorization: 'DPoP viewer-token',
                'Content-Type': 'application/json',
                DPoP: 'dpop-proof',
            },
        });
        expect(JSON.parse(String(requests[0]?.init.body))).toEqual({
            type: 'ctx-authorization-request',
            version: 1,
            broker: 'https://broker.example',
            capsule_id: 'urn:uuid:00000000-0000-4000-8000-000000000001',
            capsule_revision: 1,
            policy: summary().policy,
            policy_sha256: 'A'.repeat(43),
            payload_id: 'primary',
            release_handle: 'release_handle_0000000000000000000000000000',
            action: 'render',
            cryptographic_suite: 'ctx-capsule-v1',
            view_event_consent: true,
        });
    });

    it('rejects creator-capable or non-DPoP sessions before network authorization', async () => {
        const calls: string[] = [];
        const client = new ViewerCtxAuthorizationClient('https://trust.example/ctx/authorize', {
            dpop: proofFactory(),
            fetch: async () => {
                calls.push('fetch');
                return jsonResponse({});
            },
        });

        await expect(
            client.authorize(summary(), token(['ctx:authorize', 'capsule:create']), device(), true),
        ).resolves.toEqual({ ok: false, code: 'invalid_session' });
        await expect(
            client.authorize(
                summary(),
                { ...token(['ctx:authorize']), tokenType: 'Bearer' },
                device(),
                true,
            ),
        ).resolves.toEqual({ ok: false, code: 'invalid_session' });
        expect(calls).toEqual([]);
    });

    it('fails closed on denied or malformed authorization responses', async () => {
        await expect(
            new ViewerCtxAuthorizationClient('https://trust.example/ctx/authorize', {
                dpop: proofFactory(),
                fetch: async () => jsonResponse({ type: 'ctx-error', version: 1 }, 403),
            }).authorize(summary(), token(['ctx:authorize']), device(), true),
        ).resolves.toEqual({ ok: false, code: 'authorization_denied' });

        await expect(
            new ViewerCtxAuthorizationClient('https://trust.example/ctx/authorize', {
                dpop: proofFactory(),
                fetch: async () => jsonResponse({ type: 'ctx-authorization', version: 1 }),
            }).authorize(summary(), token(['ctx:authorize']), device(), true),
        ).resolves.toEqual({ ok: false, code: 'invalid_response' });
    });
});

function proofFactory(): ViewerCtxAuthorizationOptions['dpop'] {
    return {
        createResourceProof: async () => 'dpop-proof',
    } as Pick<DpopProofFactory, 'createResourceProof'> as DpopProofFactory;
}

function jsonResponse(value: unknown, status = 201): Response {
    return new Response(JSON.stringify(value), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

function token(scopes: readonly string[]): OAuthTokenSet {
    return {
        accessToken: 'viewer-token',
        tokenType: 'DPoP',
        scopes,
        expiresIn: 600,
        refreshToken: 'refresh-token',
    };
}

function device(): StoredViewerDeviceKeys {
    return {
        deviceId: 'device-1',
        proofPrivateKey: {} as CryptoKey,
        proofPublicKey: { kty: 'OKP', crv: 'Ed25519', x: 'proof' },
        agreementPrivateKey: {} as CryptoKey,
        agreementPublicKey: { kty: 'OKP', crv: 'X25519', x: 'agreement' },
    };
}

function summary(): VerifiedViewerCapsuleSummary {
    return {
        capsuleId: 'urn:uuid:00000000-0000-4000-8000-000000000001',
        capsuleRevision: 1,
        title: 'Verified Capsule',
        contentProfileId: 'ctx.content.static-image',
        contentProfileVersion: '1.0',
        mediaType: 'image/png',
        payloadId: 'primary',
        payloadPath: 'payloads/primary.enc',
        payloadPlaintextBytes: 112,
        payloadNonce: new Uint8Array(12),
        payloadEncryptionContext: {} as VerifiedViewerCapsuleSummary['payloadEncryptionContext'],
        profileMetadata: {
            width: 1,
            height: 1,
            pixelCount: 1,
        },
        ctxIssuer: 'https://trust.example',
        policy: {
            type: 'ctx-policy',
            version: 1,
            combiner: 'all',
            requirements: [
                { predicate: 'ctx.account.email-verified', equals: true },
                { predicate: 'ctx.account.active', equals: true },
                { predicate: 'ctx.viewer.device-registered', equals: true },
                { predicate: 'ctx.consent.capsule-view-event', equals: true },
            ],
        },
        policySha256: 'A'.repeat(43),
        broker: 'https://broker.example',
        releaseHandle: 'release_handle_0000000000000000000000000000',
        ciphertextBytes: 128,
    };
}
