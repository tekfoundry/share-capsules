import {
    STATIC_IMAGE_PROFILE_ID,
    STATIC_IMAGE_PROFILE_VERSION,
    decryptPayloadV1,
} from '@sharecapsules/capsule-core';

import { StaticImageCreatorProfileV1 } from './static-image-creator-profile.js';
import type { VerifiedViewerCapsuleSummary } from './viewer-capsule-verifier.js';

export type ViewerPayloadRenderFailureCode =
    | 'decryption_failed'
    | 'unsupported_profile'
    | 'invalid_plaintext'
    | 'profile_mismatch'
    | 'render_failed';

export type ViewerPayloadRenderResult =
    | {
          readonly ok: true;
          readonly objectUrl: string;
          readonly mediaType: string;
          readonly altText: string;
      }
    | {
          readonly ok: false;
          readonly code: ViewerPayloadRenderFailureCode;
      };

export interface ViewerPayloadRendererOptions {
    readonly profile?: StaticImageCreatorProfileV1;
    readonly objectUrls?: ViewerObjectUrlFactory;
}

export interface ViewerObjectUrlFactory {
    create(blob: Blob): string;
    revoke(url: string): void;
}

export class ViewerPayloadRenderer {
    private readonly profile: StaticImageCreatorProfileV1;
    private readonly objectUrls: ViewerObjectUrlFactory;

    public constructor(options: ViewerPayloadRendererOptions = {}) {
        this.profile = options.profile ?? new StaticImageCreatorProfileV1();
        this.objectUrls = options.objectUrls ?? browserObjectUrls();
    }

    public async render(
        summary: VerifiedViewerCapsuleSummary,
        encryptedPayload: Uint8Array,
        contentKey: Uint8Array,
    ): Promise<ViewerPayloadRenderResult> {
        if (
            summary.contentProfileId !== STATIC_IMAGE_PROFILE_ID ||
            summary.contentProfileVersion !== STATIC_IMAGE_PROFILE_VERSION
        ) {
            contentKey.fill(0);
            return { ok: false, code: 'unsupported_profile' };
        }

        let plaintext: Uint8Array | undefined;
        try {
            plaintext = await decryptPayloadV1(
                encryptedPayload,
                contentKey,
                summary.payloadNonce,
                summary.payloadEncryptionContext,
            );
        } catch {
            contentKey.fill(0);
            return { ok: false, code: 'decryption_failed' };
        } finally {
            contentKey.fill(0);
        }

        try {
            const inspection = await this.profile.inspect({
                size: plaintext.byteLength,
                read: async () => {
                    if (plaintext === undefined) throw new Error('Plaintext was disposed.');
                    return plaintext;
                },
            });
            if (!inspection.valid) return { ok: false, code: 'invalid_plaintext' };

            const metadata = inspection.metadata;
            if (
                metadata.mediaType !== summary.mediaType ||
                metadata.encodedBytes !== summary.payloadPlaintextBytes ||
                metadata.width !== summary.profileMetadata.width ||
                metadata.height !== summary.profileMetadata.height ||
                metadata.pixelCount !== summary.profileMetadata.pixelCount
            ) {
                return { ok: false, code: 'profile_mismatch' };
            }

            const blob = new Blob([toArrayBuffer(plaintext)], { type: metadata.mediaType });
            return {
                ok: true,
                objectUrl: this.objectUrls.create(blob),
                mediaType: metadata.mediaType,
                altText: summary.description ?? summary.title ?? 'Protected Capsule content',
            };
        } catch {
            return { ok: false, code: 'render_failed' };
        } finally {
            plaintext?.fill(0);
        }
    }

    public dispose(result: ViewerPayloadRenderResult): void {
        if (result.ok) this.objectUrls.revoke(result.objectUrl);
    }
}

function browserObjectUrls(): ViewerObjectUrlFactory {
    return {
        create: (blob) => URL.createObjectURL(blob),
        revoke: (url) => URL.revokeObjectURL(url),
    };
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
}
