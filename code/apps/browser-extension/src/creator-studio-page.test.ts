import { readFile } from 'node:fs/promises';

import { describe, expect, it, vi } from 'vitest';

import {
    checkCreatorAccountConnection,
    ensureActiveCreatorSigningKey,
    establishCreatorAccountConnection,
    creatorBuildErrorMessage,
    prepareCreatorSigningRecovery,
    replacementWorkspaceRecoveryMaterials,
} from './creator-studio-page.js';
import { CreatorCapsuleWorkflowError } from './creator-capsule-workflow.js';
import type { CreatorSigningKeyRecord, CreatorSigningKeySummary } from './creator-signing-key.js';
import type { CreatorSigningKeyRecoveryMaterials } from './creator-signing-key-recovery.js';

describe('Creator Studio creation flow', () => {
    it('puts workspace recovery before the grouped Capsule creation flow', async () => {
        const html = await readFile(new URL('../creator-studio.html', import.meta.url), 'utf8');
        const workspace = html.indexOf('id="workspace-heading"');
        const build = html.indexOf('id="build-heading"');
        const details = html.indexOf('id="capsule-details-heading"');
        const source = html.indexOf('id="source-heading"');
        const save = html.indexOf('id="save-heading"');

        expect(workspace).toBeGreaterThan(-1);
        expect(build).toBeGreaterThan(workspace);
        expect(details).toBeGreaterThan(build);
        expect(source).toBeGreaterThan(details);
        expect(save).toBeGreaterThan(source);
        expect(html).toContain('Workspace and recovery');
        expect(html).toContain('Create and save Capsule');
        expect(html).toContain('Capsule file name');
        expect(html).toContain('data-creator-workspace-name');
        expect(html).toContain('Example website markup');
        expect(html).toContain('data-creator-instructions-link');
        expect(html).toMatch(/data-creator-workspace-choose[\s\S]*?>\s*Choose workspace\s*</u);
        expect(html).not.toContain('Choose your workspace');
        expect(html).not.toContain('Signing identity and recovery');
        expect(html).not.toContain('data-creator-host-url');
        expect(html).not.toContain('data-creator-host-fallback');
    });

    it('surfaces safe creation failure details without exposing secrets', () => {
        expect(
            creatorBuildErrorMessage(
                new CreatorCapsuleWorkflowError('build_failed', 'invalid_input'),
            ),
        ).toBe(
            'Share Capsules could not accept this Capsule policy. Check the access settings and try again.',
        );
        expect(
            creatorBuildErrorMessage(
                new CreatorCapsuleWorkflowError('build_failed', 'registration_failed'),
            ),
        ).toBe('The Capsule key service could not register this Capsule. Nothing was saved.');
        expect(creatorBuildErrorMessage(new CreatorCapsuleWorkflowError('build_failed'))).toBe(
            'The Capsule could not be safely built and verified. Nothing was saved.',
        );
    });
});

describe('Creator Studio account status', () => {
    it('reports whether a usable stored Creator session exists', async () => {
        const connected = vi.fn().mockResolvedValue(true);
        const disconnected = vi.fn().mockResolvedValue(false);

        await expect(checkCreatorAccountConnection(connected)).resolves.toBe('connected');
        await expect(checkCreatorAccountConnection(disconnected)).resolves.toBe('disconnected');
        expect(connected).toHaveBeenCalledOnce();
        expect(disconnected).toHaveBeenCalledOnce();
    });

    it('offers connection when no checker exists and recovers from storage failures', async () => {
        await expect(checkCreatorAccountConnection()).resolves.toBe('disconnected');
        await expect(
            checkCreatorAccountConnection(async () => {
                throw new Error('storage unavailable');
            }),
        ).resolves.toBe('check-failed');
    });

    it('connects automatically only when a usable session is absent', async () => {
        const connect = vi.fn().mockResolvedValue(undefined);

        await expect(establishCreatorAccountConnection(connect, async () => true)).resolves.toBe(
            'connected',
        );
        expect(connect).not.toHaveBeenCalled();

        await expect(establishCreatorAccountConnection(connect, async () => false)).resolves.toBe(
            'connected',
        );
        expect(connect).toHaveBeenCalledOnce();
    });

    it('keeps account-gated actions unavailable when automatic connection fails', async () => {
        await expect(
            establishCreatorAccountConnection(async () => {
                throw new Error('connection failed');
            }),
        ).resolves.toBe('failed');
    });
});

describe('Creator Studio recovery preparation', () => {
    const confirmedKey: CreatorSigningKeySummary = {
        id: 'creator_confirmed',
        algorithm: 'Ed25519',
        publicKey: 'a'.repeat(43),
        status: 'active',
        createdAt: '2026-06-22T12:00:00.000Z',
        statusChangedAt: '2026-06-22T12:00:00.000Z',
        recoveryStatus: 'confirmed',
        recoveryConfirmedAt: '2026-06-22T12:01:00.000Z',
    };

    it('skips recovery creation when the active key is already recovery-confirmed', async () => {
        const generate = vi.fn();
        const activeSigningKey = vi.fn();
        const create = vi.fn();

        await expect(
            prepareCreatorSigningRecovery(
                {
                    list: async () => [confirmedKey],
                    generate,
                    activeSigningKey,
                },
                { create },
            ),
        ).resolves.toEqual({ status: 'ready', keyId: 'creator_confirmed' });
        expect(generate).not.toHaveBeenCalled();
        expect(activeSigningKey).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
    });

    it('creates a signing key and recovery materials on first use', async () => {
        const requiredKey: CreatorSigningKeySummary = {
            ...confirmedKey,
            id: 'creator_first_use',
            recoveryStatus: 'required',
            recoveryConfirmedAt: undefined,
        };
        const keyRecord: CreatorSigningKeyRecord = {
            ...requiredKey,
            privateKey: {} as CryptoKey,
        };
        const materials = {
            bundle: { type: 'share-capsules-creator-key-recovery' },
            recoveryCode: 'recovery-code',
        } as unknown as CreatorSigningKeyRecoveryMaterials;
        let keys: readonly CreatorSigningKeySummary[] = [];
        const generate = vi.fn(async () => {
            keys = [requiredKey];
            return requiredKey;
        });
        const create = vi.fn(async () => materials);

        await expect(
            prepareCreatorSigningRecovery(
                {
                    list: async () => keys,
                    generate,
                    activeSigningKey: async () => keyRecord,
                },
                { create },
            ),
        ).resolves.toEqual({
            status: 'save-required',
            keyId: 'creator_first_use',
            materials,
        });
        expect(generate).toHaveBeenCalledOnce();
        expect(create).toHaveBeenCalledWith(keyRecord);
    });

    it('creates replacement recovery materials when the selected workspace is empty', async () => {
        const keyRecord = {
            ...confirmedKey,
            privateKey: {} as CryptoKey,
        } as CreatorSigningKeyRecord;
        const materials = {
            bundle: { type: 'share-capsules-creator-key-recovery' },
            recoveryCode: 'replacement-code',
        } as unknown as CreatorSigningKeyRecoveryMaterials;
        const create = vi.fn(async () => materials);

        await expect(
            replacementWorkspaceRecoveryMaterials(
                confirmedKey.id,
                { activeSigningKey: async () => keyRecord },
                { create },
                {
                    hasRecoveryBundle: async () => false,
                    saveAndDownload: vi.fn(),
                },
            ),
        ).resolves.toBe(materials);
        expect(create).toHaveBeenCalledWith(keyRecord);

        await expect(
            replacementWorkspaceRecoveryMaterials(
                confirmedKey.id,
                { activeSigningKey: async () => keyRecord },
                { create },
                {
                    hasRecoveryBundle: async () => true,
                    saveAndDownload: vi.fn(),
                },
            ),
        ).resolves.toBeUndefined();
    });
});

describe('Creator workspace signing identity', () => {
    it('reuses the active key or creates exactly one before workspace selection', async () => {
        const existing = {
            id: 'creator_0123456789abcdef0123456789abcdef',
            status: 'active' as const,
        } as CreatorSigningKeySummary;
        const generate = vi.fn();

        await expect(
            ensureActiveCreatorSigningKey({ list: async () => [existing], generate }),
        ).resolves.toBe(existing.id);
        expect(generate).not.toHaveBeenCalled();

        let keys: readonly CreatorSigningKeySummary[] = [];
        const create = vi.fn(async () => {
            keys = [existing];
            return existing;
        });
        await expect(
            ensureActiveCreatorSigningKey({ list: async () => keys, generate: create }),
        ).resolves.toBe(existing.id);
        expect(create).toHaveBeenCalledOnce();
    });
});
