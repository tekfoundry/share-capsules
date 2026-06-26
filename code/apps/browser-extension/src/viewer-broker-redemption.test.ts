import { encodeBase64Url } from '@sharecapsules/capsule-core';
import { describe, expect, it } from 'vitest';

import {
    ViewerBrokerRedemptionClient,
    type KeyReleaseProofProducer,
} from './viewer-broker-redemption.js';
import type { VerifiedViewerCapsuleSummary } from './viewer-capsule-verifier.js';
import { okpJwkThumbprint, type StoredViewerDeviceKeys } from './viewer-device.js';

describe('Viewer broker redemption client', () => {
    it('redeems an authorization ticket with the broker and unwraps the content key in memory', async () => {
        const requests: { readonly url: string; readonly init: RequestInit }[] = [];
        const device = mockDevice();
        const ticket = await ticketFor(summary(), device);
        const contentKey = new Uint8Array(32).fill(7);
        const client = new ViewerBrokerRedemptionClient({
            proofFactory: proofFactory(),
            openContentKey: async () => contentKey,
            now: () => 1_800_000_000_000,
            fetch: async (url, init) => {
                requests.push({ url: url.toString(), init: init ?? {} });
                return jsonResponse({
                    type: 'ctx-key-release',
                    version: 1,
                    ticket_jti: ticketIdentifier,
                    cryptographic_suite: 'ctx-capsule-v1',
                    enc: encodeBase64Url(new Uint8Array(32).fill(1)),
                    ciphertext: encodeBase64Url(new Uint8Array(48).fill(2)),
                });
            },
        });

        await expect(client.redeem(summary(), ticket, device)).resolves.toEqual({
            ok: true,
            contentKey,
            ticketJti: ticketIdentifier,
        });

        expect(requests).toHaveLength(1);
        expect(requests[0]?.url).toBe('http://localhost:3004/releases');
        expect(requests[0]?.init).toMatchObject({
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
        });
        expect(JSON.parse(String(requests[0]?.init.body))).toEqual({
            ticket,
            proof: 'release-proof',
            agreement_public_key: 'B'.repeat(43),
        });
    });

    it('fails before network redemption when ticket bindings do not match the verified Capsule', async () => {
        const calls: string[] = [];
        const device = mockDevice();
        const ticket = await ticketFor({ ...summary(), capsuleId: otherCapsuleId }, device);
        const client = new ViewerBrokerRedemptionClient({
            proofFactory: proofFactory(),
            now: () => 1_800_000_000_000,
            fetch: async () => {
                calls.push('fetch');
                return jsonResponse({});
            },
        });

        await expect(client.redeem(summary(), ticket, device)).resolves.toEqual({
            ok: false,
            code: 'invalid_ticket',
            retryable: false,
        });
        expect(calls).toEqual([]);
    });

    it('returns broker denial without exposing release details to the host page', async () => {
        const device = mockDevice();
        const client = new ViewerBrokerRedemptionClient({
            proofFactory: proofFactory(),
            now: () => 1_800_000_000_000,
            fetch: async () =>
                jsonResponse(
                    {
                        type: 'ctx-error',
                        version: 1,
                        code: 'release_unavailable',
                        retryable: false,
                    },
                    400,
                ),
        });

        await expect(
            client.redeem(summary(), await ticketFor(summary(), device), device),
        ).resolves.toEqual({
            ok: false,
            code: 'release_denied',
            denialCode: 'release_unavailable',
            retryable: false,
        });
    });

    it('surfaces rate limiting as a retryable safe category', async () => {
        const device = mockDevice();
        const client = new ViewerBrokerRedemptionClient({
            proofFactory: proofFactory(),
            now: () => 1_800_000_000_000,
            fetch: async () => jsonResponse('Too many requests', 429),
        });

        await expect(
            client.redeem(summary(), await ticketFor(summary(), device), device),
        ).resolves.toEqual({
            ok: false,
            code: 'rate_limited',
            retryable: true,
        });
    });

    it('fails closed when a broker denial has an unknown public code', async () => {
        const device = mockDevice();
        const client = new ViewerBrokerRedemptionClient({
            proofFactory: proofFactory(),
            now: () => 1_800_000_000_000,
            fetch: async () =>
                jsonResponse(
                    {
                        type: 'ctx-error',
                        version: 1,
                        code: 'new_unreviewed_code',
                        retryable: false,
                    },
                    400,
                ),
        });

        await expect(
            client.redeem(summary(), await ticketFor(summary(), device), device),
        ).resolves.toEqual({
            ok: false,
            code: 'invalid_response',
            retryable: false,
        });
    });

    it('fails closed on malformed broker responses or unwrap failures', async () => {
        const device = mockDevice();

        await expect(
            new ViewerBrokerRedemptionClient({
                proofFactory: proofFactory(),
                now: () => 1_800_000_000_000,
                fetch: async () => jsonResponse({ type: 'ctx-key-release', version: 1 }),
            }).redeem(summary(), await ticketFor(summary(), device), device),
        ).resolves.toEqual({ ok: false, code: 'invalid_response', retryable: false });

        await expect(
            new ViewerBrokerRedemptionClient({
                proofFactory: proofFactory(),
                now: () => 1_800_000_000_000,
                openContentKey: async () => {
                    throw new Error('nope');
                },
                fetch: async () =>
                    jsonResponse({
                        type: 'ctx-key-release',
                        version: 1,
                        ticket_jti: ticketIdentifier,
                        cryptographic_suite: 'ctx-capsule-v1',
                        enc: encodeBase64Url(new Uint8Array(32).fill(1)),
                        ciphertext: encodeBase64Url(new Uint8Array(48).fill(2)),
                    }),
            }).redeem(summary(), await ticketFor(summary(), device), device),
        ).resolves.toEqual({ ok: false, code: 'unwrap_failed', retryable: false });
    });

    it.each([
        null,
        true,
        false,
        0,
        '',
        [],
        {},
        { type: 'ctx-key-release', version: 1 },
        {
            type: 'ctx-key-release',
            version: 1,
            ticket_jti: ticketIdentifier,
            cryptographic_suite: 'ctx-capsule-v1',
            enc: encodeBase64Url(new Uint8Array(31)),
            ciphertext: encodeBase64Url(new Uint8Array(48)),
        },
        {
            type: 'ctx-key-release',
            version: 1,
            ticket_jti: ticketIdentifier,
            cryptographic_suite: 'ctx-capsule-v1',
            enc: encodeBase64Url(new Uint8Array(32)),
            ciphertext: encodeBase64Url(new Uint8Array(48)),
            plaintext_key: 'secret',
        },
        {
            type: 'ctx-key-release',
            version: 1,
            ticket_jti: 'other-ticket',
            cryptographic_suite: 'ctx-capsule-v1',
            enc: encodeBase64Url(new Uint8Array(32)),
            ciphertext: encodeBase64Url(new Uint8Array(48)),
        },
        {
            type: 'ctx-key-release',
            version: 1,
            ticket_jti: ticketIdentifier,
            cryptographic_suite: 'ctx-capsule-v2',
            enc: encodeBase64Url(new Uint8Array(32)),
            ciphertext: encodeBase64Url(new Uint8Array(48)),
        },
    ])('property-style key-release envelope parser fails closed for %#', async (payload) => {
        const device = mockDevice();

        await expect(
            new ViewerBrokerRedemptionClient({
                proofFactory: proofFactory(),
                now: () => 1_800_000_000_000,
                fetch: async () => jsonResponse(payload),
            }).redeem(summary(), await ticketFor(summary(), device), device),
        ).resolves.toEqual({ ok: false, code: 'invalid_response', retryable: false });
    });

    it.each([
        null,
        true,
        false,
        0,
        '',
        [],
        {},
        { type: 'ctx-error', version: 1 },
        { type: 'ctx-error', version: 1, code: 'raw_internal_score', retryable: false },
        { type: 'ctx-error', version: 1, code: 'release_unavailable', retryable: 'false' },
        {
            type: 'ctx-error',
            version: 1,
            code: 'release_unavailable',
            retryable: false,
            raw_evidence: 'private',
        },
    ])('property-style error-envelope parser fails closed for %#', async (payload) => {
        const device = mockDevice();

        await expect(
            new ViewerBrokerRedemptionClient({
                proofFactory: proofFactory(),
                now: () => 1_800_000_000_000,
                fetch: async () => jsonResponse(payload, 400),
            }).redeem(summary(), await ticketFor(summary(), device), device),
        ).resolves.toEqual({ ok: false, code: 'invalid_response', retryable: false });
    });

    it.each(['', '.', 'a', 'a.b', 'a.b.c.d', '!!!!.!!!!.!!!!', `${'x'.repeat(2048)}.b.c`])(
        'property-style ticket parser rejects malformed compact JWT %s without network',
        async (ticket) => {
            const calls: string[] = [];

            await expect(
                new ViewerBrokerRedemptionClient({
                    proofFactory: proofFactory(),
                    now: () => 1_800_000_000_000,
                    fetch: async () => {
                        calls.push('fetch');
                        return jsonResponse({});
                    },
                }).redeem(summary(), ticket, mockDevice()),
            ).resolves.toEqual({ ok: false, code: 'invalid_ticket', retryable: false });
            expect(calls).toEqual([]);
        },
    );
});

const otherCapsuleId = 'urn:uuid:00000000-0000-4000-8000-000000000002';
const ticketIdentifier = 'ticket-000000000001';

function proofFactory(): KeyReleaseProofProducer {
    return {
        createProof: async () => 'release-proof',
    };
}

function jsonResponse(value: unknown, status = 200): Response {
    return new Response(JSON.stringify(value), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

async function ticketFor(
    value: VerifiedViewerCapsuleSummary,
    device: StoredViewerDeviceKeys,
): Promise<string> {
    return [
        encodeBase64Url(new TextEncoder().encode(JSON.stringify({ alg: 'EdDSA' }))),
        encodeBase64Url(
            new TextEncoder().encode(
                JSON.stringify({
                    iss: value.ctxIssuer,
                    aud: value.broker,
                    jti: ticketIdentifier,
                    iat: 1_800_000_000,
                    nbf: 1_800_000_000,
                    exp: 1_800_000_060,
                    ctx: {
                        version: 1,
                        capsule_id: value.capsuleId,
                        capsule_revision: value.capsuleRevision,
                        policy_sha256: value.policySha256,
                        payload_id: value.payloadId,
                        release_handle: value.releaseHandle,
                        action: 'render',
                        cryptographic_suite: 'ctx-capsule-v1',
                        proof_jkt: await okpJwkThumbprint(device.proofPublicKey),
                        agreement_jkt: await okpJwkThumbprint(device.agreementPublicKey),
                    },
                }),
            ),
        ),
        encodeBase64Url(new Uint8Array(64).fill(3)),
    ].join('.');
}

function mockDevice(): StoredViewerDeviceKeys {
    return {
        deviceId: 'device-1',
        proofPrivateKey: {} as CryptoKey,
        proofPublicKey: { kty: 'OKP', crv: 'Ed25519', x: 'A'.repeat(43) },
        agreementPrivateKey: {} as CryptoKey,
        agreementPublicKey: { kty: 'OKP', crv: 'X25519', x: 'B'.repeat(43) },
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
        ctxIssuer: 'http://localhost:3003',
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
        policySha256: 'C'.repeat(43),
        broker: 'http://localhost:3004',
        releaseHandle: 'D'.repeat(43),
        ciphertextBytes: 128,
    };
}
