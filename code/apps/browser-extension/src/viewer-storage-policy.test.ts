import { describe, expect, it } from 'vitest';

import { guardedViewerStorage, VIEWER_ALLOWED_STORAGE_KEYS } from './viewer-storage-policy.js';

describe('Viewer storage policy', () => {
    it('allows only reviewed Viewer state in extension storage', async () => {
        const storage = new MemoryStorage();
        const guarded = guardedViewerStorage(storage);

        await guarded.set({
            viewer_device_id: 'viewer-device-1',
            viewer_token: {
                accessToken: 'access-token',
                tokenType: 'DPoP',
                scopes: ['ctx:authorize'],
                expiresAt: 2_000,
            },
            viewer_disclosure_consents_v1: [],
        });

        await expect(guarded.get(VIEWER_ALLOWED_STORAGE_KEYS)).resolves.toMatchObject({
            viewer_device_id: 'viewer-device-1',
            viewer_token: {
                tokenType: 'DPoP',
                scopes: ['ctx:authorize'],
            },
            viewer_disclosure_consents_v1: [],
        });
    });

    it('rejects accidental persistence of protected content, keys, or one-use protocol material', async () => {
        const guarded = guardedViewerStorage(new MemoryStorage());

        for (const key of [
            'viewer_plaintext',
            'viewer_content_key',
            'viewer_object_url',
            'viewer_authorization_ticket',
            'viewer_key_release_proof',
            'viewer_decrypted_payload',
        ]) {
            await expect(guarded.set({ [key]: 'secret-ish material' })).rejects.toThrow(
                'Viewer storage key is not approved',
            );
            await expect(guarded.get([key])).rejects.toThrow('Viewer storage key is not approved');
        }
    });
});

class MemoryStorage {
    public readonly values: Record<string, unknown> = {};

    public async get(keys: readonly string[]): Promise<Record<string, unknown>> {
        return Object.fromEntries(keys.map((key) => [key, this.values[key]]));
    }

    public async set(items: Record<string, unknown>): Promise<void> {
        Object.assign(this.values, structuredClone(items));
    }
}
