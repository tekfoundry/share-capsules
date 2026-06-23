import {
    CapsuleZipError,
    ManifestSignatureError,
    ManifestValidationError,
    ctxPolicySha256,
    decodeBase64Url,
    payloadEncryptionContextFromManifest,
    verifyCapsuleZipV1,
    type CapsuleManifestV1,
    type CtxPolicyV1,
    type PayloadEncryptionContextV1,
} from '@sharecapsules/capsule-core';

export type ViewerCapsuleVerificationFailureCode =
    | 'invalid_archive'
    | 'invalid_manifest'
    | 'invalid_signature'
    | 'size_exceeded'
    | 'untrusted_ctx_issuer'
    | 'untrusted_broker';

export type ViewerCapsuleVerificationResult =
    | {
          readonly ok: true;
          readonly summary: VerifiedViewerCapsuleSummary;
          readonly encryptedPayload: Uint8Array;
      }
    | {
          readonly ok: false;
          readonly code: ViewerCapsuleVerificationFailureCode;
      };

export interface ViewerCapsuleVerifierOptions {
    readonly acceptedCtxIssuers?: readonly string[];
    readonly acceptedBrokers?: readonly string[];
}

export interface VerifiedViewerCapsuleSummary {
    readonly capsuleId: string;
    readonly capsuleRevision: number;
    readonly title?: string;
    readonly description?: string;
    readonly contentProfileId: string;
    readonly contentProfileVersion: string;
    readonly mediaType: string;
    readonly payloadId: string;
    readonly payloadPath: string;
    readonly payloadPlaintextBytes: number;
    readonly payloadNonce: Uint8Array;
    readonly payloadEncryptionContext: PayloadEncryptionContextV1;
    readonly profileMetadata: {
        readonly width: number;
        readonly height: number;
        readonly pixelCount: number;
    };
    readonly ctxIssuer: string;
    readonly policy: CtxPolicyV1;
    readonly policySha256: string;
    readonly broker: string;
    readonly releaseHandle: string;
    readonly ciphertextBytes: number;
}

export async function verifyFetchedViewerCapsule(
    bytes: Uint8Array,
    options: ViewerCapsuleVerifierOptions = {},
): Promise<ViewerCapsuleVerificationResult> {
    try {
        const verified = await verifyCapsuleZipV1(bytes);
        const trustFailure = validateAcceptedProviderIdentities(verified.manifest, options);
        if (trustFailure !== undefined) return { ok: false, code: trustFailure };

        return {
            ok: true,
            summary: await capsuleSummary(verified.manifest),
            encryptedPayload: verified.encryptedPayload,
        };
    } catch (error) {
        return { ok: false, code: verificationFailureCode(error) };
    }
}

function validateAcceptedProviderIdentities(
    manifest: CapsuleManifestV1,
    options: ViewerCapsuleVerifierOptions,
): ViewerCapsuleVerificationFailureCode | undefined {
    if (
        options.acceptedCtxIssuers !== undefined &&
        !options.acceptedCtxIssuers.includes(manifest.ctx.issuer)
    ) {
        return 'untrusted_ctx_issuer';
    }

    if (
        options.acceptedBrokers !== undefined &&
        !options.acceptedBrokers.includes(manifest.payloads[0].key_release.broker)
    ) {
        return 'untrusted_broker';
    }

    return undefined;
}

async function capsuleSummary(manifest: CapsuleManifestV1): Promise<VerifiedViewerCapsuleSummary> {
    const payload = manifest.payloads[0];
    return Object.freeze({
        capsuleId: manifest.capsule.id,
        capsuleRevision: manifest.capsule.revision,
        title: manifest.description?.title,
        description: manifest.description?.description,
        contentProfileId: manifest.content_profile.id,
        contentProfileVersion: manifest.content_profile.version,
        mediaType: payload.media_type,
        payloadId: payload.id,
        payloadPath: payload.path,
        payloadPlaintextBytes: payload.plaintext_size,
        payloadNonce: decodeBase64Url(payload.encryption.nonce),
        payloadEncryptionContext: payloadEncryptionContextFromManifest(manifest),
        profileMetadata: Object.freeze({
            width: payload.profile_metadata.width,
            height: payload.profile_metadata.height,
            pixelCount: payload.profile_metadata.pixel_count,
        }),
        ctxIssuer: manifest.ctx.issuer,
        policy: structuredClone(manifest.policy),
        policySha256: await ctxPolicySha256(manifest.policy),
        broker: payload.key_release.broker,
        releaseHandle: payload.key_release.handle,
        ciphertextBytes: payload.ciphertext_size,
    });
}

function verificationFailureCode(error: unknown): ViewerCapsuleVerificationFailureCode {
    if (error instanceof CapsuleZipError) {
        if (error.code === 'invalid_signature') return 'invalid_signature';
        if (error.code === 'size_exceeded') return 'size_exceeded';
        return 'invalid_archive';
    }

    if (error instanceof ManifestValidationError) return 'invalid_manifest';
    if (error instanceof ManifestSignatureError) return 'invalid_signature';

    return 'invalid_archive';
}
