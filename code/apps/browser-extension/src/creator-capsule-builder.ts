import {
    ACCOUNT_ACTIVE_PREDICATE,
    ACCOUNT_CAPSULE_LIFETIME_LIMIT_PREDICATE,
    AUTOMATION_RISK_NOT_HIGH_PREDICATE,
    CAPSULE_ACCESS_WINDOW_PREDICATE,
    CAPSULE_LIFETIME_LIMIT_PREDICATE,
    CAPSULE_SUITE_ID,
    CTX_POLICY_COMBINER,
    CTX_POLICY_TYPE,
    CTX_POLICY_VERSION,
    DEVICE_REGISTERED_PREDICATE,
    EMAIL_VERIFIED_PREDICATE,
    STATIC_IMAGE_PROFILE_ID,
    STATIC_IMAGE_PROFILE_VERSION,
    VIEW_EVENT_CONSENT_PREDICATE,
    assembleCapsuleZipV1,
    ctxPolicySha256,
    decodeBase64Url,
    encodeBase64Url,
    encryptPayloadV1,
    importEd25519PublicKey,
    parseCapsuleManifest,
    parseCtxPolicyV1,
    payloadPath,
    sha256Base64Url,
    signCapsuleManifest,
    verifyCapsuleZipV1,
    type CapsuleManifestV1,
    type CtxPolicyV1,
    type PayloadEncryptionContextV1,
    type StaticImageMetadataV1,
} from '@sharecapsules/capsule-core';

import {
    CreatorBrokerRegistrationError,
    type CreatorBrokerRegistrationInput,
    type CreatorBrokerRegistrationResult,
    createBrokerRegistrationId,
} from './creator-broker-registration.js';
import type { ContentByteSource } from './creator-content-profile.js';
import { CreatorPayloadSecretsFactory } from './creator-payload-secrets.js';
import type { CreatorSigningKeyRecord } from './creator-signing-key.js';
import type { CreatorStudioDraftV1 } from './creator-studio.js';
import type { OAuthTokenSet } from './oauth.js';
import type { StoredViewerDeviceKeys } from './viewer-device.js';

export interface CreatorCapsuleBuilderConfiguration {
    readonly ctxIssuer: string;
    readonly automationRiskIssuer: string;
}

export interface CreatorCapsuleBuildInput {
    readonly draft: CreatorStudioDraftV1;
    readonly source: ContentByteSource;
    readonly metadata: StaticImageMetadataV1;
    readonly signingKey: CreatorSigningKeyRecord;
    readonly token: OAuthTokenSet;
    readonly device: StoredViewerDeviceKeys;
}

export interface BuiltCapsuleV1 {
    readonly manifest: CapsuleManifestV1;
    readonly manifestSignature: Uint8Array;
    readonly encryptedPayload: Uint8Array;
    readonly archive: Uint8Array;
    readonly registration: CreatorBrokerRegistrationResult;
}

export interface BrokerKeyRegistrar {
    register(
        input: CreatorBrokerRegistrationInput,
        secrets: ReturnType<CreatorPayloadSecretsFactory['create']>,
        token: OAuthTokenSet,
        device: StoredViewerDeviceKeys,
    ): Promise<CreatorBrokerRegistrationResult>;
    finalize(
        registration: CreatorBrokerRegistrationResult,
        token: OAuthTokenSet,
        device: StoredViewerDeviceKeys,
    ): Promise<void>;
    cancel(
        registration: CreatorBrokerRegistrationResult,
        token: OAuthTokenSet,
        device: StoredViewerDeviceKeys,
    ): Promise<void>;
}

export class CreatorCapsuleBuildError extends Error {
    public constructor(
        public readonly code:
            | 'broker_registration_failed'
            | 'build_failed'
            | 'invalid_configuration'
            | 'invalid_source'
            | 'recovery_required',
        public readonly detail?: string,
    ) {
        super(code);
        this.name = 'CreatorCapsuleBuildError';
    }
}

type CreatorCapsuleBuildFailureDetail =
    | 'archive_assembly_failed'
    | 'archive_verification_failed'
    | 'manifest_signing_failed'
    | 'manifest_validation_failed'
    | 'payload_encryption_failed'
    | 'policy_build_failed'
    | 'verified_manifest_mismatch';

export class CreatorCapsuleBuilderV1 {
    public constructor(
        private readonly configuration: CreatorCapsuleBuilderConfiguration,
        private readonly broker: BrokerKeyRegistrar,
        private readonly secretFactory = new CreatorPayloadSecretsFactory(),
        private readonly randomUUID: () => `${string}-${string}-${string}-${string}-${string}` = () =>
            crypto.randomUUID(),
        private readonly now: () => Date = () => new Date(),
    ) {
        validateIssuer(configuration.ctxIssuer);
        validateIssuer(configuration.automationRiskIssuer);
    }

    public async build(input: CreatorCapsuleBuildInput): Promise<BuiltCapsuleV1> {
        if (
            input.signingKey.status !== 'active' ||
            input.signingKey.recoveryStatus !== 'confirmed'
        ) {
            throw new CreatorCapsuleBuildError('recovery_required');
        }
        const plaintext = await readSource(input.source, input.metadata);
        const secrets = this.secretFactory.create();
        let registration: CreatorBrokerRegistrationResult | undefined;
        try {
            const capsuleId = `urn:uuid:${this.randomUUID()}`;
            const capsuleRevision = 1;
            const payloadId = 'primary';
            const path = payloadPath(payloadId);
            const policy = buildStage('policy_build_failed', () =>
                buildCtxPolicyV1(input.draft, this.configuration.automationRiskIssuer),
            );
            const policySha256 = await buildAsyncStage('policy_build_failed', () =>
                ctxPolicySha256(policy),
            );
            const nonce = secrets.nonceBytes();
            const context: PayloadEncryptionContextV1 = Object.freeze({
                type: 'ctx-capsule-payload-aad',
                version: '1.0',
                cryptographic_suite: CAPSULE_SUITE_ID,
                capsule: Object.freeze({ id: capsuleId, revision: capsuleRevision }),
                content_profile: Object.freeze({
                    id: STATIC_IMAGE_PROFILE_ID,
                    version: STATIC_IMAGE_PROFILE_VERSION,
                }),
                payload: Object.freeze({
                    id: payloadId,
                    path,
                    media_type: input.metadata.mediaType,
                    plaintext_size: plaintext.byteLength,
                }),
            });
            const encrypted = await buildAsyncStage('payload_encryption_failed', () =>
                secrets.withContentKey((contentKey) =>
                    encryptPayloadV1(plaintext, contentKey, nonce, context),
                ),
            );

            try {
                registration = await this.broker.register(
                    {
                        registrationId: createBrokerRegistrationId(this.randomUUID),
                        capsuleId,
                        capsuleRevision,
                        payloadId,
                        policySha256,
                        policy,
                        title: input.draft.description.title,
                        contentProfileId: STATIC_IMAGE_PROFILE_ID,
                        contentProfileVersion: STATIC_IMAGE_PROFILE_VERSION,
                        mediaType: input.metadata.mediaType,
                    },
                    secrets,
                    input.token,
                    input.device,
                );
            } catch (error) {
                throw new CreatorCapsuleBuildError(
                    'broker_registration_failed',
                    brokerRegistrationFailureDetail(error),
                );
            }
            const brokerRegistration = registration;
            const manifest = await buildAsyncStage('manifest_validation_failed', async () =>
                parseCapsuleManifest({
                    type: 'capsule-manifest',
                    format_version: '1.0',
                    capsule: {
                        id: capsuleId,
                        revision: capsuleRevision,
                        created_at: canonicalInstant(this.now()),
                    },
                    cryptographic_suite: CAPSULE_SUITE_ID,
                    creator: {
                        signing_key: {
                            id: input.signingKey.id,
                            algorithm: input.signingKey.algorithm,
                            public_key: input.signingKey.publicKey,
                        },
                    },
                    content_profile: {
                        id: STATIC_IMAGE_PROFILE_ID,
                        version: STATIC_IMAGE_PROFILE_VERSION,
                    },
                    description: {
                        title: input.draft.description.title,
                        ...(input.draft.description.description === undefined
                            ? {}
                            : { description: input.draft.description.description }),
                    },
                    policy,
                    ctx: { issuer: this.configuration.ctxIssuer },
                    payloads: [
                        {
                            id: payloadId,
                            path,
                            media_type: input.metadata.mediaType,
                            plaintext_size: plaintext.byteLength,
                            ciphertext_size: encrypted.ciphertext.byteLength,
                            ciphertext_sha256: await sha256Base64Url(encrypted.ciphertext),
                            encryption: {
                                representation: 'whole',
                                nonce: encodeBase64Url(nonce),
                            },
                            key_release: {
                                broker: brokerRegistration.broker,
                                handle: brokerRegistration.releaseHandle,
                            },
                            profile_metadata: {
                                width: input.metadata.width,
                                height: input.metadata.height,
                                pixel_count: input.metadata.pixelCount,
                            },
                        },
                    ],
                }),
            );
            const publicKey = await buildAsyncStage('manifest_signing_failed', () =>
                importEd25519PublicKey(decodeBase64Url(input.signingKey.publicKey)),
            );
            const signature = await buildAsyncStage('manifest_signing_failed', () =>
                signCapsuleManifest(manifest, {
                    privateKey: input.signingKey.privateKey,
                    publicKey,
                }),
            );
            const archive = await buildAsyncStage('archive_assembly_failed', () =>
                assembleCapsuleZipV1(manifest, signature, encrypted.ciphertext),
            );
            const verified = await buildAsyncStage('archive_verification_failed', () =>
                verifyCapsuleZipV1(archive),
            );
            if (
                verified.manifest.capsule.id !== manifest.capsule.id ||
                verified.manifest.capsule.revision !== manifest.capsule.revision
            ) {
                throw new CreatorCapsuleBuildError('build_failed', 'verified_manifest_mismatch');
            }
            try {
                await this.broker.finalize(registration, input.token, input.device);
            } catch (error) {
                throw new CreatorCapsuleBuildError(
                    'broker_registration_failed',
                    brokerRegistrationFailureDetail(error),
                );
            }

            return Object.freeze({
                manifest,
                manifestSignature: signature,
                encryptedPayload: encrypted.ciphertext,
                archive,
                registration,
            });
        } catch (error) {
            if (registration !== undefined) {
                try {
                    await this.broker.cancel(registration, input.token, input.device);
                } catch {
                    // A server-accepted cancellation remains retryable through scheduled cleanup.
                }
            }
            if (error instanceof CreatorCapsuleBuildError) throw error;
            throw new CreatorCapsuleBuildError('build_failed');
        } finally {
            plaintext.fill(0);
            secrets.destroy();
        }
    }
}

function brokerRegistrationFailureDetail(error: unknown): string | undefined {
    if (error instanceof CreatorBrokerRegistrationError) {
        return error.code;
    }

    return undefined;
}

function buildStage<T>(detail: CreatorCapsuleBuildFailureDetail, callback: () => T): T {
    try {
        return callback();
    } catch (error) {
        if (error instanceof CreatorCapsuleBuildError) throw error;
        throw new CreatorCapsuleBuildError('build_failed', detail);
    }
}

async function buildAsyncStage<T>(
    detail: CreatorCapsuleBuildFailureDetail,
    callback: () => Promise<T>,
): Promise<T> {
    try {
        return await callback();
    } catch (error) {
        if (error instanceof CreatorCapsuleBuildError) throw error;
        throw new CreatorCapsuleBuildError('build_failed', detail);
    }
}

export function buildCtxPolicyV1(
    draft: CreatorStudioDraftV1,
    automationRiskIssuer: string,
): CtxPolicyV1 {
    const requirements: Array<Record<string, unknown>> = [
        { predicate: EMAIL_VERIFIED_PREDICATE, equals: true },
        { predicate: ACCOUNT_ACTIVE_PREDICATE, equals: true },
        { predicate: DEVICE_REGISTERED_PREDICATE, equals: true },
        { predicate: VIEW_EVENT_CONSENT_PREDICATE, equals: true },
    ];
    if (draft.policy.access_window !== undefined) {
        requirements.push({
            predicate: CAPSULE_ACCESS_WINDOW_PREDICATE,
            ...draft.policy.access_window,
        });
    }
    if (draft.policy.capsule_lifetime_maximum !== undefined) {
        requirements.push({
            predicate: CAPSULE_LIFETIME_LIMIT_PREDICATE,
            scope: 'capsule',
            maximum: draft.policy.capsule_lifetime_maximum,
        });
    }
    if (draft.policy.account_capsule_lifetime_maximum !== undefined) {
        requirements.push({
            predicate: ACCOUNT_CAPSULE_LIFETIME_LIMIT_PREDICATE,
            scope: 'account-and-capsule',
            maximum: draft.policy.account_capsule_lifetime_maximum,
        });
    }
    if (draft.policy.automation_risk_required) {
        requirements.push({
            predicate: AUTOMATION_RISK_NOT_HIGH_PREDICATE,
            issuer: automationRiskIssuer,
        });
    }

    return parseCtxPolicyV1({
        type: CTX_POLICY_TYPE,
        version: CTX_POLICY_VERSION,
        combiner: CTX_POLICY_COMBINER,
        requirements,
    });
}

async function readSource(
    source: ContentByteSource,
    metadata: StaticImageMetadataV1,
): Promise<Uint8Array> {
    if (source.size !== metadata.encodedBytes) throw new CreatorCapsuleBuildError('invalid_source');
    let bytes: Uint8Array;
    try {
        bytes = await source.read();
    } catch {
        throw new CreatorCapsuleBuildError('invalid_source');
    }
    if (bytes.byteLength !== metadata.encodedBytes) {
        bytes.fill(0);
        throw new CreatorCapsuleBuildError('invalid_source');
    }
    return bytes;
}

function canonicalInstant(value: Date): string {
    if (!Number.isFinite(value.getTime())) throw new CreatorCapsuleBuildError('build_failed');
    return new Date(Math.floor(value.getTime() / 1000) * 1000).toISOString().replace('.000Z', 'Z');
}

function validateIssuer(value: string): void {
    try {
        const url = new URL(value);
        if (
            (url.protocol !== 'https:' &&
                !(
                    url.protocol === 'http:' &&
                    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
                )) ||
            url.username !== '' ||
            url.password !== '' ||
            url.search !== '' ||
            url.hash !== ''
        ) {
            throw new Error('invalid issuer');
        }
    } catch {
        throw new CreatorCapsuleBuildError('invalid_configuration');
    }
}
