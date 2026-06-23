import { describe, expect, it } from 'vitest';

import {
    CreatorAccountConnector,
    CreatorCredentialStore,
    type ExtensionCredentialStorage,
} from './creator-account-connection.js';
import type { OAuthTokenSet } from './oauth.js';
import type { StoredViewerDeviceKeys, ViewerDeviceKeyStore } from './viewer-device.js';

describe('Creator account connection', () => {
    it('uses a bootstrap credential only for registration, then stores the DPoP creator session', async () => {
        const storage = new MemoryStorage();
        const keys = new MemoryDeviceKeys();
        const credentialStore = new CreatorCredentialStore(storage, keys, () => 1_000);
        const calls: string[] = [];
        const connector = new CreatorAccountConnector(
            {
                connect: async () => {
                    calls.push('bootstrap');
                    return token('Bearer', ['extension:connect']);
                },
                authorizeDevice: async () => {
                    calls.push('authorize-device');
                    return token('DPoP', ['ctx:authorize', 'capsule:create']);
                },
                refresh: async () => {
                    throw new Error('refresh should not run for a new device');
                },
            },
            {
                register: async (_name, accessToken) => {
                    calls.push(`register:${accessToken}`);
                    keys.value = { deviceId: 'device-1' } as StoredViewerDeviceKeys;
                    return { id: 'device-1' } as never;
                },
            },
            keys,
            credentialStore,
        );

        await connector.connect('Creator browser');

        expect(calls).toEqual(['bootstrap', 'register:token', 'authorize-device']);
        await expect(credentialStore.active()).resolves.toMatchObject({
            token: { tokenType: 'DPoP', scopes: ['ctx:authorize', 'capsule:create'] },
            device: { deviceId: 'device-1' },
        });
    });

    it('silently refreshes an expired session on the existing device', async () => {
        let now = 1_000;
        const storage = new MemoryStorage();
        const keys = new MemoryDeviceKeys();
        keys.value = { deviceId: 'device-1' } as StoredViewerDeviceKeys;
        const credentials = new CreatorCredentialStore(storage, keys, () => now);
        await credentials.save('device-1', token('DPoP', ['ctx:authorize', 'capsule:create']));
        now = 700_000;
        const calls: string[] = [];
        const connector = new CreatorAccountConnector(
            {
                connect: async () => {
                    throw new Error('a new connection is not needed');
                },
                authorizeDevice: async () => {
                    throw new Error('interactive authorization is not needed');
                },
                refresh: async (refreshToken, device) => {
                    calls.push(`${refreshToken}:${device.deviceId}`);
                    return {
                        ...token('DPoP', ['ctx:authorize', 'capsule:create']),
                        accessToken: 'refreshed-token',
                        refreshToken: 'rotated-refresh',
                    };
                },
            },
            {
                register: async () => {
                    throw new Error('a new device must not be registered');
                },
            },
            keys,
            credentials,
        );

        await connector.ensureConnected('Creator browser');

        expect(calls).toEqual(['refresh:device-1']);
        await expect(credentials.active()).resolves.toMatchObject({
            token: { accessToken: 'refreshed-token', refreshToken: 'rotated-refresh' },
            device: { deviceId: 'device-1' },
        });
    });

    it('reauthorizes the existing device when refresh is rejected', async () => {
        let now = 1_000;
        const storage = new MemoryStorage();
        const keys = new MemoryDeviceKeys();
        keys.value = { deviceId: 'device-1' } as StoredViewerDeviceKeys;
        const credentials = new CreatorCredentialStore(storage, keys, () => now);
        await credentials.save('device-1', token('DPoP', ['ctx:authorize', 'capsule:create']));
        now = 700_000;
        const calls: string[] = [];
        const connector = new CreatorAccountConnector(
            {
                connect: async () => {
                    throw new Error('a new connection is not needed');
                },
                refresh: async () => {
                    calls.push('refresh');
                    throw new Error('refresh rejected');
                },
                authorizeDevice: async (device) => {
                    calls.push(`authorize:${device.deviceId}`);
                    return token('DPoP', ['ctx:authorize', 'capsule:create']);
                },
            },
            {
                register: async () => {
                    throw new Error('a new device must not be registered');
                },
            },
            keys,
            credentials,
        );

        await connector.ensureConnected('Creator browser');

        expect(calls).toEqual(['refresh', 'authorize:device-1']);
        await expect(credentials.active()).resolves.toBeDefined();
    });

    it('rejects expired, malformed, or non-creator stored credentials', async () => {
        const storage = new MemoryStorage();
        const credentials = new CreatorCredentialStore(
            storage,
            new MemoryDeviceKeys(),
            () => 10_000,
        );
        for (const value of [
            null,
            {
                accessToken: 'token',
                tokenType: 'Bearer',
                scopes: ['capsule:create'],
                expiresAt: 20_000,
            },
            {
                accessToken: 'token',
                tokenType: 'DPoP',
                scopes: ['ctx:authorize'],
                expiresAt: 20_000,
            },
            {
                accessToken: 'token',
                tokenType: 'DPoP',
                scopes: ['capsule:create'],
                expiresAt: 9_999,
            },
            {
                accessToken: 'token',
                tokenType: 'DPoP',
                scopes: ['capsule:create'],
                expiresAt: 20_000,
                secret: true,
            },
        ]) {
            storage.values.creator_token = value;
            storage.values.creator_device_id = 'device-1';
            await expect(credentials.active()).resolves.toBeUndefined();
        }
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
