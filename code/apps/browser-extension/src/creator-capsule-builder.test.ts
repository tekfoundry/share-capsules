import {
    ctxPolicySha256,
    decryptPayloadV1,
    encodeBase64Url,
    payloadEncryptionContextFromManifest,
    verifyCapsuleManifestSignature,
    type StaticImageMetadataV1,
} from '@sharecapsules/capsule-core';
import { describe, expect, it } from 'vitest';

import {
    CreatorCapsuleBuildError,
    CreatorCapsuleBuilderV1,
    buildCtxPolicyV1,
    type BrokerKeyRegistrar,
} from './creator-capsule-builder.js';
import { CreatorPayloadSecretsFactory } from './creator-payload-secrets.js';
import type { CreatorSigningKeyRecord } from './creator-signing-key.js';
import { parseCreatorStudioDraftV1 } from './creator-studio.js';
import type { OAuthTokenSet } from './oauth.js';
import type { StoredViewerDeviceKeys } from './viewer-device.js';

const CAPSULE_ID = 'urn:uuid:00000000-0000-4000-8000-000000000001';
const REGISTRATION_ID = 'registration_00000000000040008000000000000002';
const BROKER = 'https://broker.example';
const RELEASE_HANDLE = encodeBase64Url(new Uint8Array(32).fill(8));

describe('local Creator Capsule builder', () => {
    it('allows the explicit localhost development issuer without allowing public HTTP', () => {
        expect(
            () =>
                new CreatorCapsuleBuilderV1(
                    {
                        ctxIssuer: 'http://localhost:3003',
                        automationRiskIssuer: 'http://localhost:3003',
                    },
                    new RecordingBroker(),
                ),
        ).not.toThrow();
        expect(
            () =>
                new CreatorCapsuleBuilderV1(
                    {
                        ctxIssuer: 'http://public.example',
                        automationRiskIssuer: 'https://trust.example',
                    },
                    new RecordingBroker(),
                ),
        ).toThrow(new CreatorCapsuleBuildError('invalid_configuration'));
    });

    it('builds canonical policy, encrypts, signs, and assembles the exact local Capsule', async () => {
        const plaintext = Uint8Array.from([1, 2, 3, 4]);
        const original = plaintext.slice();
        const broker = new RecordingBroker();
        const secrets = new RecordingSecretFactory();
        const signingKey = await creatorSigningKey();
        const builder = builderUsing(broker, secrets);

        const built = await builder.build({
            draft: fullDraft(),
            source: { size: plaintext.byteLength, read: async () => plaintext },
            metadata: metadata(plaintext.byteLength),
            signingKey,
            token: token(),
            device: await device(),
        });

        expect(built.manifest).toMatchObject({
            type: 'capsule-manifest',
            format_version: '1.0',
            capsule: { id: CAPSULE_ID, revision: 1, created_at: '2026-06-21T12:00:00Z' },
            creator: {
                signing_key: {
                    id: signingKey.id,
                    algorithm: 'Ed25519',
                    public_key: signingKey.publicKey,
                },
            },
            content_profile: { id: 'ctx.content.static-image', version: '1.0' },
            description: { title: 'Protected image', description: 'A test image.' },
            ctx: { issuer: 'https://share.example' },
            payloads: [
                {
                    id: 'primary',
                    path: 'payloads/primary.enc',
                    media_type: 'image/png',
                    plaintext_size: 4,
                    ciphertext_size: 20,
                    key_release: { broker: BROKER, handle: RELEASE_HANDLE },
                    profile_metadata: { width: 2, height: 2, pixel_count: 4 },
                },
            ],
        });
        expect(built.manifest.policy.requirements.map((item) => item.predicate)).toEqual([
            'ctx.account.email-verified',
            'ctx.account.active',
            'ctx.viewer.device-registered',
            'ctx.consent.capsule-view-event',
            'ctx.time.capsule-access-window',
            'ctx.usage.capsule-lifetime-limit',
            'ctx.usage.capsule-account-lifetime-limit',
            'ctx.risk.ecosystem-automation-not-high',
        ]);
        expect(broker.input).toMatchObject({
            registrationId: REGISTRATION_ID,
            capsuleId: CAPSULE_ID,
            capsuleRevision: 1,
            payloadId: 'primary',
            policySha256: await ctxPolicySha256(built.manifest.policy),
            title: 'Protected image',
            contentProfileId: 'ctx.content.static-image',
            contentProfileVersion: '1.0',
            mediaType: 'image/png',
        });
        expect(await verifyCapsuleManifestSignature(built.manifest, built.manifestSignature)).toBe(
            true,
        );
        await expect(
            decryptPayloadV1(
                built.encryptedPayload,
                broker.contentKey,
                decodeNonce(built.manifest.payloads[0].encryption.nonce),
                payloadEncryptionContextFromManifest(built.manifest),
            ),
        ).resolves.toEqual(original);
        expect(readU32Le(built.archive, 0)).toBe(0x04034b50);
        expect(new TextDecoder().decode(built.archive)).toContain('manifest.json');
        expect(new TextDecoder().decode(built.archive)).toContain('manifest.sig');
        expect(new TextDecoder().decode(built.archive)).toContain('payloads/primary.enc');
        expect(plaintext).toEqual(new Uint8Array(4));
        expect(secrets.created?.isDestroyed()).toBe(true);
        expect(broker.finalized).toBe(true);
        expect(broker.cancelled).toBe(false);
    });

    it('builds the mandatory policy without inventing omitted optional gates', () => {
        const policy = buildCtxPolicyV1(
            parseCreatorStudioDraftV1({
                version: 1,
                description: { title: 'Minimal' },
                fallback: { alt_text: 'Minimal' },
                policy: { automation_risk_required: false },
            }),
            'https://trust.example',
        );

        expect(policy.requirements.map((item) => item.predicate)).toEqual([
            'ctx.account.email-verified',
            'ctx.account.active',
            'ctx.viewer.device-registered',
            'ctx.consent.capsule-view-event',
        ]);
    });

    it('builds a trust policy with a loopback development issuer only', () => {
        const draft = parseCreatorStudioDraftV1({
            version: 1,
            description: { title: 'Trust Capsule' },
            fallback: { alt_text: 'Trust Capsule' },
            policy: { automation_risk_required: true },
        });

        const policy = buildCtxPolicyV1(draft, 'http://localhost:3003');

        expect(policy.requirements).toContainEqual({
            predicate: 'ctx.risk.ecosystem-automation-not-high',
            issuer: 'http://localhost:3003',
        });
        expect(() => buildCtxPolicyV1(draft, 'http://trust.example')).toThrow();
    });

    it('requires recovery confirmation before reading content or registering a key', async () => {
        let reads = 0;
        const broker = new RecordingBroker();
        const signingKey = { ...(await creatorSigningKey()), recoveryStatus: 'required' as const };

        await expect(
            builderUsing(broker).build({
                draft: fullDraft(),
                source: {
                    size: 4,
                    read: async () => {
                        reads++;
                        return new Uint8Array(4);
                    },
                },
                metadata: metadata(4),
                signingKey,
                token: token(),
                device: await device(),
            }),
        ).rejects.toEqual(new CreatorCapsuleBuildError('recovery_required'));
        expect(reads).toBe(0);
        expect(broker.calls).toBe(0);
    });

    it('erases local plaintext and secrets when broker registration fails', async () => {
        const plaintext = Uint8Array.from([9, 9, 9, 9]);
        const broker = new RecordingBroker();
        broker.fail = true;
        const secrets = new RecordingSecretFactory();

        await expect(
            builderUsing(broker, secrets).build({
                draft: fullDraft(),
                source: { size: 4, read: async () => plaintext },
                metadata: metadata(4),
                signingKey: await creatorSigningKey(),
                token: token(),
                device: await device(),
            }),
        ).rejects.toEqual(new CreatorCapsuleBuildError('broker_registration_failed'));
        expect(plaintext).toEqual(new Uint8Array(4));
        expect(secrets.created?.isDestroyed()).toBe(true);
    });

    it('rejects source bytes that no longer match inspected metadata', async () => {
        await expect(
            builderUsing(new RecordingBroker()).build({
                draft: fullDraft(),
                source: { size: 5, read: async () => new Uint8Array(5) },
                metadata: metadata(4),
                signingKey: await creatorSigningKey(),
                token: token(),
                device: await device(),
            }),
        ).rejects.toEqual(new CreatorCapsuleBuildError('invalid_source'));
    });

    it('cancels a pending broker key when local signing or verification fails', async () => {
        const broker = new RecordingBroker();
        const signingKey = await creatorSigningKey();
        const unrelated = await creatorSigningKey();

        await expect(
            builderUsing(broker).build({
                draft: fullDraft(),
                source: { size: 4, read: async () => new Uint8Array(4) },
                metadata: metadata(4),
                signingKey: { ...signingKey, publicKey: unrelated.publicKey },
                token: token(),
                device: await device(),
            }),
        ).rejects.toEqual(new CreatorCapsuleBuildError('build_failed', 'manifest_signing_failed'));
        expect(broker.finalized).toBe(false);
        expect(broker.cancelled).toBe(true);
    });

    it('cancels after ambiguous finalization so an active remote key cannot be orphaned', async () => {
        const broker = new RecordingBroker();
        broker.failFinalization = true;

        await expect(
            builderUsing(broker).build({
                draft: fullDraft(),
                source: { size: 4, read: async () => new Uint8Array(4) },
                metadata: metadata(4),
                signingKey: await creatorSigningKey(),
                token: token(),
                device: await device(),
            }),
        ).rejects.toEqual(new CreatorCapsuleBuildError('broker_registration_failed'));
        expect(broker.cancelled).toBe(true);
    });
});

class RecordingBroker implements BrokerKeyRegistrar {
    public calls = 0;
    public fail = false;
    public failFinalization = false;
    public input?: Parameters<BrokerKeyRegistrar['register']>[0];
    public contentKey = new Uint8Array();
    public finalized = false;
    public cancelled = false;

    public async register(
        input: Parameters<BrokerKeyRegistrar['register']>[0],
        secrets: Parameters<BrokerKeyRegistrar['register']>[1],
    ) {
        this.calls++;
        if (this.fail) throw new Error('broker failed');
        this.input = structuredClone(input);
        await secrets.withContentKey(async (key) => {
            this.contentKey = key.slice();
        });
        return {
            broker: BROKER,
            releaseHandle: RELEASE_HANDLE,
            registrationId: input.registrationId,
        };
    }

    public async finalize(): Promise<void> {
        if (this.failFinalization) throw new Error('finalization failed');
        this.finalized = true;
    }

    public async cancel(): Promise<void> {
        this.cancelled = true;
    }
}

class RecordingSecretFactory extends CreatorPayloadSecretsFactory {
    public created?: ReturnType<CreatorPayloadSecretsFactory['create']>;

    public override create() {
        this.created = new CreatorPayloadSecretsFactory((target) => target.fill(3)).create();
        return this.created;
    }
}

function builderUsing(
    broker: BrokerKeyRegistrar,
    secrets: CreatorPayloadSecretsFactory = new RecordingSecretFactory(),
): CreatorCapsuleBuilderV1 {
    let sequence = 0;
    return new CreatorCapsuleBuilderV1(
        {
            ctxIssuer: 'https://share.example',
            automationRiskIssuer: 'https://trust.example',
        },
        broker,
        secrets,
        () =>
            `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}` as `${string}-${string}-${string}-${string}-${string}`,
        () => new Date('2026-06-21T12:00:00.789Z'),
    );
}

function fullDraft() {
    return parseCreatorStudioDraftV1({
        version: 1,
        description: { title: 'Protected image', description: 'A test image.' },
        fallback: { alt_text: 'A test image.' },
        policy: {
            access_window: {
                not_before: '2026-07-01T05:00:00Z',
                not_after: '2026-08-01T05:00:00Z',
            },
            capsule_lifetime_maximum: 10,
            account_capsule_lifetime_maximum: 2,
            automation_risk_required: true,
        },
    });
}

function metadata(encodedBytes: number): StaticImageMetadataV1 {
    return {
        mediaType: 'image/png',
        encodedBytes,
        width: 2,
        height: 2,
        pixelCount: 4,
        nominalDecodedRgbaBytes: 16,
    };
}

async function creatorSigningKey(): Promise<CreatorSigningKeyRecord> {
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
        createdAt: '2026-06-21T11:00:00.000Z',
        statusChangedAt: '2026-06-21T11:00:00.000Z',
        recoveryStatus: 'confirmed',
        recoveryConfirmedAt: '2026-06-21T11:05:00.000Z',
    };
}

function token(): OAuthTokenSet {
    return { accessToken: 'token', tokenType: 'DPoP', expiresIn: 600, scopes: ['capsule:create'] };
}

async function device(): Promise<StoredViewerDeviceKeys> {
    const proof = await crypto.subtle.generateKey('Ed25519', false, ['sign', 'verify']);
    const agreement = await crypto.subtle.generateKey('X25519', false, ['deriveBits']);
    return {
        deviceId: 'device',
        proofPrivateKey: proof.privateKey,
        proofPublicKey: { kty: 'OKP', crv: 'Ed25519', x: 'proof' },
        agreementPrivateKey: agreement.privateKey,
        agreementPublicKey: { kty: 'OKP', crv: 'X25519', x: 'agreement' },
    };
}

function decodeNonce(value: string): Uint8Array {
    const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
    const binary = atob(base64.padEnd(16, '='));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function readU32Le(value: Uint8Array, offset: number): number {
    return new DataView(value.buffer, value.byteOffset, value.byteLength).getUint32(offset, true);
}
