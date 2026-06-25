import type { StaticImageMetadataV1 } from '@sharecapsules/capsule-core';

import {
    CreatorCapsuleBuildError,
    type BrokerKeyRegistrar,
    type BuiltCapsuleV1,
    type CreatorCapsuleBuilderV1,
} from './creator-capsule-builder.js';
import type { ContentByteSource } from './creator-content-profile.js';
import type { CreatorStudioDraftV1, LocalCreatorSource } from './creator-studio.js';
import type { CreatorSigningKeyRecord } from './creator-signing-key.js';
import type { OAuthTokenSet } from './oauth.js';
import type { StoredViewerDeviceKeys } from './viewer-device.js';

export interface CreatorPublicationSession {
    readonly token: OAuthTokenSet;
    readonly device: StoredViewerDeviceKeys;
}

export interface CreatorPublicationSessionProvider {
    active(): Promise<CreatorPublicationSession | undefined>;
}

export interface CapsuleArchiveDownloader {
    download(signingKeyId: string, filename: string, archive: Uint8Array): Promise<void>;
}

export interface CreatorBuildSelection {
    selectedSource(): (LocalCreatorSource & ContentByteSource) | undefined;
    selectedMetadata(): StaticImageMetadataV1 | undefined;
    draftValue(): CreatorStudioDraftV1;
}

export interface PublicationSigningKeyProvider {
    publicationSigningKey(): Promise<CreatorSigningKeyRecord>;
}

export class CreatorCapsuleWorkflowError extends Error {
    public constructor(
        public readonly code:
            | 'build_failed'
            | 'download_failed'
            | 'file_required'
            | 'session_required'
            | 'signing_key_required',
        public readonly detail?: string,
    ) {
        super(code);
        this.name = 'CreatorCapsuleWorkflowError';
    }
}

export class CreatorCapsuleWorkflow {
    public constructor(
        private readonly surface: CreatorBuildSelection,
        private readonly keys: PublicationSigningKeyProvider,
        private readonly sessions: CreatorPublicationSessionProvider,
        private readonly builder: Pick<CreatorCapsuleBuilderV1, 'build'>,
        private readonly cancellation: Pick<BrokerKeyRegistrar, 'cancel'>,
        private readonly downloader: CapsuleArchiveDownloader,
        private readonly title: string,
    ) {}

    public async buildAndDownload(filename: string = this.title): Promise<BuiltCapsuleV1> {
        const source = this.surface.selectedSource();
        const metadata = this.surface.selectedMetadata();
        if (source === undefined || metadata === undefined) {
            throw new CreatorCapsuleWorkflowError('file_required');
        }

        let signingKey;
        try {
            signingKey = await this.keys.publicationSigningKey();
        } catch {
            throw new CreatorCapsuleWorkflowError('signing_key_required');
        }
        const session = await this.sessions.active();
        if (session === undefined) {
            throw new CreatorCapsuleWorkflowError('session_required');
        }

        let built: BuiltCapsuleV1;
        try {
            built = await this.builder.build({
                draft: this.surface.draftValue(),
                source,
                metadata,
                signingKey,
                token: session.token,
                device: session.device,
            });
        } catch (error) {
            throw new CreatorCapsuleWorkflowError(
                'build_failed',
                error instanceof CreatorCapsuleBuildError
                    ? (error.detail ?? error.code)
                    : undefined,
            );
        }

        try {
            await this.downloader.download(signingKey.id, capsuleFilename(filename), built.archive);
        } catch {
            try {
                await this.cancellation.cancel(built.registration, session.token, session.device);
            } catch {
                // A server-accepted cancellation remains retryable through scheduled cleanup.
            }
            throw new CreatorCapsuleWorkflowError('download_failed');
        }

        return built;
    }
}

export function capsuleFilename(name: string): string {
    const slug = name
        .replace(/\.capsule$/iu, '')
        .normalize('NFKD')
        .replaceAll(/[^A-Za-z0-9]+/gu, '-')
        .replaceAll(/^-|-$/gu, '')
        .toLowerCase()
        .slice(0, 80);

    return `${slug === '' ? 'share-capsule' : slug}.capsule`;
}
