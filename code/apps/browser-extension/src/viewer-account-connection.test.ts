import { describe, expect, it } from 'vitest';

import type { ExtensionCredentialStorage } from './creator-account-connection.js';
import type { OAuthTokenSet } from './oauth.js';
import { ViewerAccountConnector, ViewerCredentialStore } from './viewer-account-connection.js';
import type { StoredViewerDeviceKeys, ViewerDeviceKeyStore } from './viewer-device.js';

describe('Viewer account connection', () => {
    it('registers a device with bootstrap credentials and stores only a Viewer authorization session', async () => {
        const storage = new MemoryStorage();
        const keys = new MemoryDeviceKeys();
        const credentials = new ViewerCredentialStore(storage, keys, () => 1_000);
        const calls: string[] = [];
        const connector = new ViewerAccountConnector(
            {
                connect: async () => {
                    calls.push('bootstrap');
                    return token('Bearer', ['extension:connect']);
                },
                authorizeDevice: async () => {
                    calls.push('authorize-device');
                    return token('DPoP', ['ctx:authorize']);
                },
                refresh: async () => {
                    throw new Error('refresh should not run for a new device');
                },
            },
            {
                register: async (_name, accessToken) => {
                    calls.push(`register:${accessToken}`);
                    keys.value = { deviceId: 'viewer-device-1' } as StoredViewerDeviceKeys;
                    return { id: 'viewer-device-1' } as never;
                },
            },
            keys,
            credentials,
        );

        await connector.connect('Viewer browser');

        expect(calls).toEqual(['bootstrap', 'register:token', 'authorize-device']);
        await expect(credentials.active()).resolves.toMatchObject({
            token: { tokenType: 'DPoP', scopes: ['ctx:authorize'] },
            device: { deviceId: 'viewer-device-1' },
        });
    });

    it('rejects creator-capable sessions from Viewer storage', async () => {
        const credentials = new ViewerCredentialStore(
            new MemoryStorage(),
            new MemoryDeviceKeys(),
            () => 1_000,
        );

        await expect(
            credentials.save('device-1', token('DPoP', ['ctx:authorize', 'capsule:create'])),
        ).rejects.toThrow('The Viewer token is not authorization-capable.');
    });

    it('refreshes an expired Viewer session for an existing registered device', async () => {
        let now = 1_000;
        const storage = new MemoryStorage();
        const keys = new MemoryDeviceKeys();
        keys.value = { deviceId: 'viewer-device-1' } as StoredViewerDeviceKeys;
        const credentials = new ViewerCredentialStore(storage, keys, () => now);
        await credentials.save('viewer-device-1', token('DPoP', ['ctx:authorize']));
        now = 700_000;
        const calls: string[] = [];
        const connector = new ViewerAccountConnector(
            {
                connect: async () => {
                    throw new Error('new connection should not run');
                },
                authorizeDevice: async () => {
                    throw new Error('interactive authorization should not run');
                },
                refresh: async (refreshToken, device) => {
                    calls.push(`${refreshToken}:${device.deviceId}`);
                    return {
                        ...token('DPoP', ['ctx:authorize']),
                        accessToken: 'refreshed-viewer-token',
                    };
                },
            },
            {
                register: async () => {
                    throw new Error('new registration should not run');
                },
            },
            keys,
            credentials,
        );

        await connector.ensureConnected('Viewer browser');

        expect(calls).toEqual(['refresh:viewer-device-1']);
        await expect(credentials.active()).resolves.toMatchObject({
            token: { accessToken: 'refreshed-viewer-token', scopes: ['ctx:authorize'] },
            device: { deviceId: 'viewer-device-1' },
        });
    });

    it('ignores malformed, expired, missing-device, and creator-scoped stored credentials', async () => {
        const storage = new MemoryStorage();
        const keys = new MemoryDeviceKeys();
        const credentials = new ViewerCredentialStore(storage, keys, () => 10_000);

        for (const value of [
            null,
            {
                accessToken: 'token',
                tokenType: 'Bearer',
                scopes: ['ctx:authorize'],
                expiresAt: 20_000,
            },
            {
                accessToken: 'token',
                tokenType: 'DPoP',
                scopes: ['ctx:authorize', 'capsule:create'],
                expiresAt: 20_000,
            },
            {
                accessToken: 'token',
                tokenType: 'DPoP',
                scopes: ['ctx:authorize'],
                expiresAt: 9_999,
            },
            {
                accessToken: 'token',
                tokenType: 'DPoP',
                scopes: ['ctx:authorize'],
                expiresAt: 20_000,
                secret: true,
            },
        ]) {
            storage.values.viewer_token = value;
            storage.values.viewer_device_id = 'device-1';
            await expect(credentials.active()).resolves.toBeUndefined();
        }

        storage.values.viewer_token = {
            accessToken: 'token',
            tokenType: 'DPoP',
            scopes: ['ctx:authorize'],
            expiresAt: 20_000,
        };
        storage.values.viewer_device_id = 'device-1';
        await expect(credentials.active()).resolves.toBeUndefined();
    });
});

class MemoryStorage implements ExtensionCredentialStorage {
    public readonly values: Record<string, unknown> = {};

    public async get(keys: readonly string[]): Promise<Record<string, unknown>> {
        return Object.fromEntries(keys.map((key) => [key, this.values[key]]));
    }

    public async set(items: Record<string, unknown>): Promise<void> {
        Object.assign(this.values, structuredClone(items));
    }
}

class MemoryDeviceKeys implements ViewerDeviceKeyStore {
    public value?: StoredViewerDeviceKeys;

    public async save(keys: StoredViewerDeviceKeys): Promise<void> {
        this.value = keys;
    }

    public async load(deviceId: string): Promise<StoredViewerDeviceKeys | undefined> {
        return this.value?.deviceId === deviceId ? this.value : undefined;
    }

    public async remove(): Promise<void> {
        this.value = undefined;
    }
}

function token(tokenType: 'Bearer' | 'DPoP', scopes: readonly string[]): OAuthTokenSet {
    return { accessToken: 'token', tokenType, scopes, expiresIn: 600, refreshToken: 'refresh' };
}
