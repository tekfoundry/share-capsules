import { describe, expect, it } from 'vitest';

import { CreatorCapsuleBuildError, type BuiltCapsuleV1 } from './creator-capsule-builder.js';
import {
    CreatorCapsuleWorkflow,
    CreatorCapsuleWorkflowError,
    type CapsuleArchiveDownloader,
    type CreatorBuildSelection,
    type CreatorPublicationSessionProvider,
    type PublicationSigningKeyProvider,
} from './creator-capsule-workflow.js';

const ARCHIVE = Uint8Array.from([80, 75, 3, 4]);

describe('Creator Capsule publication workflow', () => {
    it('requires validated local input, a recovered signing key, and an authenticated device', async () => {
        const cases = [
            [selection(false), keys(true), sessions(true), 'file_required'],
            [selection(true), keys(false), sessions(true), 'signing_key_required'],
            [selection(true), keys(true), sessions(false), 'session_required'],
        ] as const;

        for (const [selected, signingKeys, publicationSessions, code] of cases) {
            const builder = new RecordingBuilder();
            const downloader = new RecordingDownloader();
            await expect(
                new CreatorCapsuleWorkflow(
                    selected,
                    signingKeys,
                    publicationSessions,
                    builder,
                    new RecordingCancellation(),
                    downloader,
                    'Private artwork',
                ).buildAndDownload(),
            ).rejects.toEqual(new CreatorCapsuleWorkflowError(code));
            expect(builder.calls).toBe(0);
            expect(downloader.downloads).toEqual([]);
        }
    });

    it('builds once and downloads only the strictly verified builder result', async () => {
        const builder = new RecordingBuilder();
        const downloader = new RecordingDownloader();
        const workflow = new CreatorCapsuleWorkflow(
            selection(true),
            keys(true),
            sessions(true),
            builder,
            new RecordingCancellation(),
            downloader,
            'Private artwork',
        );

        const built = await workflow.buildAndDownload('Family portrait.capsule');

        expect(built.archive).toEqual(ARCHIVE);
        expect(builder.calls).toBe(1);
        expect(downloader.downloads).toEqual([
            {
                signingKeyId: 'creator_00000000000000000000000000000000',
                filename: 'family-portrait.capsule',
                archive: ARCHIVE,
            },
        ]);
    });

    it('does not report success when build or download fails', async () => {
        const builder = new RecordingBuilder();
        builder.fail = true;
        await expect(
            new CreatorCapsuleWorkflow(
                selection(true),
                keys(true),
                sessions(true),
                builder,
                new RecordingCancellation(),
                new RecordingDownloader(),
                'Capsule',
            ).buildAndDownload(),
        ).rejects.toEqual(new CreatorCapsuleWorkflowError('build_failed'));

        const downloader = new RecordingDownloader();
        downloader.fail = true;
        const cancellation = new RecordingCancellation();
        await expect(
            new CreatorCapsuleWorkflow(
                selection(true),
                keys(true),
                sessions(true),
                new RecordingBuilder(),
                cancellation,
                downloader,
                'Capsule',
            ).buildAndDownload(),
        ).rejects.toEqual(new CreatorCapsuleWorkflowError('download_failed'));
        expect(cancellation.calls).toBe(1);
    });

    it('preserves safe builder failure details for creator troubleshooting', async () => {
        const builder = new RecordingBuilder();
        builder.buildError = new CreatorCapsuleBuildError(
            'broker_registration_failed',
            'invalid_input',
        );

        await expect(
            new CreatorCapsuleWorkflow(
                selection(true),
                keys(true),
                sessions(true),
                builder,
                new RecordingCancellation(),
                new RecordingDownloader(),
                'Capsule',
            ).buildAndDownload(),
        ).rejects.toEqual(new CreatorCapsuleWorkflowError('build_failed', 'invalid_input'));
    });
});

class RecordingBuilder {
    public calls = 0;
    public fail = false;
    public buildError: Error | undefined;

    public async build(): Promise<BuiltCapsuleV1> {
        this.calls++;
        if (this.buildError !== undefined) throw this.buildError;
        if (this.fail) throw new Error('build failed');
        return {
            manifest: {} as never,
            manifestSignature: new Uint8Array(),
            encryptedPayload: new Uint8Array(),
            archive: ARCHIVE,
            registration: {} as never,
        };
    }
}

class RecordingCancellation {
    public calls = 0;

    public async cancel(): Promise<void> {
        this.calls++;
    }
}

class RecordingDownloader implements CapsuleArchiveDownloader {
    public downloads: Array<{
        signingKeyId: string;
        filename: string;
        archive: Uint8Array;
    }> = [];
    public fail = false;

    public async download(
        signingKeyId: string,
        filename: string,
        archive: Uint8Array,
    ): Promise<void> {
        if (this.fail) throw new Error('download failed');
        this.downloads.push({ signingKeyId, filename, archive });
    }
}

function selection(available: boolean): CreatorBuildSelection {
    return {
        selectedSource: () =>
            available
                ? { name: 'image.png', size: 4, mediaType: 'image/png', read: async () => ARCHIVE }
                : undefined,
        selectedMetadata: () =>
            available
                ? {
                      mediaType: 'image/png',
                      encodedBytes: 4,
                      width: 1,
                      height: 1,
                      pixelCount: 1,
                      nominalDecodedRgbaBytes: 4,
                  }
                : undefined,
        draftValue: () => ({
            version: 1,
            description: { title: 'Private artwork' },
            fallback: { alt_text: 'Private artwork' },
            policy: { automation_risk_required: false },
        }),
    };
}

function keys(available: boolean): PublicationSigningKeyProvider {
    return {
        publicationSigningKey: async () => {
            if (!available) throw new Error('missing key');
            return { id: 'creator_00000000000000000000000000000000' } as never;
        },
    };
}

function sessions(available: boolean): CreatorPublicationSessionProvider {
    return {
        active: async () => (available ? ({} as never) : undefined),
    };
}
