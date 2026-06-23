import { describe, expect, it } from 'vitest';

import {
    CreatorStudioDraftError,
    CreatorStudioSurface,
    parseCreatorStudioDraftV1,
    type CreatorStudioRenderer,
    type CreatorStudioViewModel,
} from './creator-studio.js';

const draft = () => ({
    version: 1,
    description: { title: 'Protected landscape', description: 'Mountains at sunset.' },
    fallback: { alt_text: 'Mountains at sunset.' },
    policy: {
        access_window: {
            not_before: '2026-07-01T05:00:00Z',
            not_after: '2026-08-01T05:00:00Z',
        },
        capsule_lifetime_maximum: 25,
        account_capsule_lifetime_maximum: 3,
        automation_risk_required: true,
    },
});

describe('extension-owned Creator Studio', () => {
    it('strictly accepts and freezes the exact versioned handoff', () => {
        const parsed = parseCreatorStudioDraftV1(JSON.stringify(draft()));

        expect(parsed).toEqual(draft());
        expect(Object.isFrozen(parsed)).toBe(true);
        expect(Object.isFrozen(parsed.policy)).toBe(true);
        expect(Object.isFrozen(parsed.policy.access_window)).toBe(true);
    });

    it.each([
        { ...draft(), source_file: 'private.jpg' },
        { ...draft(), private_key: 'secret' },
        { ...draft(), version: 2 },
        { ...draft(), fallback: { alt_text: 'substituted text' } },
        {
            ...draft(),
            policy: { ...draft().policy, account_capsule_lifetime_maximum: 30 },
        },
        {
            ...draft(),
            policy: {
                ...draft().policy,
                access_window: {
                    not_before: '2026-08-01T05:00:00Z',
                    not_after: '2026-07-01T05:00:00Z',
                },
            },
        },
    ])('rejects an unknown, private, or inconsistent handoff %#', (value) => {
        expect(() => parseCreatorStudioDraftV1(value)).toThrow(CreatorStudioDraftError);
    });

    it('accepts omitted description, dates, and limits with title fallback', () => {
        expect(
            parseCreatorStudioDraftV1({
                version: 1,
                description: { title: 'Minimal Capsule' },
                fallback: { alt_text: 'Minimal Capsule' },
                policy: { automation_risk_required: false },
            }),
        ).toEqual({
            version: 1,
            description: { title: 'Minimal Capsule' },
            fallback: { alt_text: 'Minimal Capsule' },
            policy: { automation_risk_required: false },
        });
    });

    it('renders a plain-language summary and keeps the selected source private', async () => {
        const renderer = new RecordingRenderer();
        const source = Object.freeze({
            name: 'landscape.jpg',
            size: 1024,
            mediaType: 'image/jpeg',
            privateBytes: new Uint8Array([1, 2, 3]),
        });
        const surface = new CreatorStudioSurface(
            parseCreatorStudioDraftV1(draft()),
            { choose: async () => source },
            renderer,
        );

        surface.start();
        await surface.chooseSource();

        expect(renderer.models.at(0)).toMatchObject({
            status: 'ready',
            title: 'Protected landscape',
            totalLimitSummary: '25 total openings',
            accountLimitSummary: '3 openings per user account',
            automationRiskSummary: 'Automation protection on',
        });
        expect(renderer.models.at(-1)).toMatchObject({
            status: 'file-selected',
            selectedFile: {
                name: 'landscape.jpg',
                size: 1024,
                mediaType: 'image/jpeg',
            },
        });
        expect(renderer.models.at(-1)).not.toHaveProperty('selectedFile.privateBytes');
        expect(surface.selectedSource()).toBe(source);
    });

    it('returns to ready when local file selection is cancelled', async () => {
        const renderer = new RecordingRenderer();
        const surface = new CreatorStudioSurface(
            parseCreatorStudioDraftV1(draft()),
            { choose: async () => undefined },
            renderer,
        );

        surface.start();
        await surface.chooseSource();

        expect(renderer.models.map((model) => model.status)).toEqual([
            'ready',
            'choosing-file',
            'ready',
        ]);
        expect(surface.selectedSource()).toBeUndefined();
    });

    it('retains only a profile-validated source and its normalized metadata', async () => {
        const renderer = new RecordingRenderer();
        const source = { name: 'valid.png', size: 12, mediaType: 'image/png' };
        const metadata = { width: 2, height: 2 };
        const surface = new CreatorStudioSurface(
            parseCreatorStudioDraftV1(draft()),
            { choose: async () => source },
            renderer,
            { inspect: async () => ({ valid: true, metadata }) },
        );

        await surface.chooseSource();

        expect(renderer.models.map((model) => model.status)).toEqual([
            'choosing-file',
            'validating-file',
            'file-selected',
        ]);
        expect(surface.selectedSource()).toBe(source);
        expect(surface.selectedMetadata()).toBe(metadata);
    });

    it('does not retain a source rejected by its content profile', async () => {
        const renderer = new RecordingRenderer();
        const surface = new CreatorStudioSurface(
            parseCreatorStudioDraftV1(draft()),
            { choose: async () => ({ name: 'active.svg', size: 12, mediaType: 'image/svg+xml' }) },
            renderer,
            {
                inspect: async () => ({
                    valid: false,
                    issues: [
                        {
                            code: 'unsupported_content',
                            message: 'Choose a static JPEG, PNG, or WebP image.',
                        },
                    ],
                }),
            },
        );

        await surface.chooseSource();

        expect(renderer.models.at(-1)).toMatchObject({
            status: 'file-invalid',
            sourceIssue: 'Choose a static JPEG, PNG, or WebP image.',
        });
        expect(surface.selectedSource()).toBeUndefined();
        expect(surface.selectedMetadata()).toBeUndefined();
    });
});

class RecordingRenderer implements CreatorStudioRenderer {
    public readonly models: CreatorStudioViewModel[] = [];

    public render(model: CreatorStudioViewModel): void {
        this.models.push(structuredClone(model));
    }
}
