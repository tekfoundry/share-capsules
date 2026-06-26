import type { ExtensionCredentialStorage } from './creator-account-connection.js';
import type { ExtensionOAuthClient, OAuthTokenSet } from './oauth.js';
import type {
    StoredViewerDeviceKeys,
    ViewerDeviceKeyStore,
    ViewerDeviceRegistrar,
} from './viewer-device.js';

export const VIEWER_CREDENTIAL_STORAGE_KEYS = Object.freeze(['viewer_token', 'viewer_device_id']);
const VIEWER_TOKEN_REFRESH_BUFFER_MS = 60_000;

export class ViewerCredentialStore {
    public constructor(
        private readonly storage: ExtensionCredentialStorage,
        private readonly devices: ViewerDeviceKeyStore,
        private readonly now: () => number = () => Date.now(),
    ) {}

    public async save(deviceId: string, token: OAuthTokenSet): Promise<void> {
        if (
            token.tokenType !== 'DPoP' ||
            !token.scopes.includes('ctx:authorize') ||
            token.scopes.includes('capsule:create')
        ) {
            throw new Error('The Viewer token is not authorization-capable.');
        }

        await this.storage.set({
            viewer_device_id: deviceId,
            viewer_token: {
                accessToken: token.accessToken,
                tokenType: token.tokenType,
                scopes: [...token.scopes],
                expiresAt: this.now() + token.expiresIn * 1000,
                ...(token.refreshToken === undefined ? {} : { refreshToken: token.refreshToken }),
            },
        });
    }

    public async active(): Promise<
        { readonly token: OAuthTokenSet; readonly device: StoredViewerDeviceKeys } | undefined
    > {
        const stored = await this.stored();
        return stored === undefined ||
            stored.expiresAt <= this.now() + VIEWER_TOKEN_REFRESH_BUFFER_MS
            ? undefined
            : { token: stored.token, device: stored.device };
    }

    public async stored(): Promise<
        | {
              readonly token: OAuthTokenSet;
              readonly device: StoredViewerDeviceKeys;
              readonly expiresAt: number;
          }
        | undefined
    > {
        const stored = await this.storage.get(VIEWER_CREDENTIAL_STORAGE_KEYS);
        const credential = parseStoredViewerToken(stored.viewer_token, this.now());
        const deviceId = stored.viewer_device_id;
        if (credential === undefined || typeof deviceId !== 'string') return undefined;
        const device = await this.devices.load(deviceId);
        return device === undefined ? undefined : { ...credential, device };
    }
}

export class ViewerAccountConnector {
    public constructor(
        private readonly oauth: Pick<
            ExtensionOAuthClient,
            'connect' | 'authorizeDevice' | 'refresh'
        >,
        private readonly devices: Pick<ViewerDeviceRegistrar, 'register'>,
        private readonly deviceKeys: ViewerDeviceKeyStore,
        private readonly credentials: ViewerCredentialStore,
    ) {}

    public async ensureConnected(deviceName: string): Promise<void> {
        if ((await this.credentials.active()) !== undefined) return;

        const stored = await this.credentials.stored();
        if (stored !== undefined) {
            if (stored.token.refreshToken !== undefined) {
                try {
                    const refreshed = await this.oauth.refresh(
                        stored.token.refreshToken,
                        stored.device,
                    );
                    await this.credentials.save(stored.device.deviceId, refreshed);
                    return;
                } catch {
                    // Fall through to interactive reauthorization for the existing device.
                }
            }

            try {
                const reauthorized = await this.oauth.authorizeDevice(stored.device);
                await this.credentials.save(stored.device.deviceId, reauthorized);
                return;
            } catch {
                // A revoked or missing device requires a fresh connection and registration.
            }
        }

        await this.connect(deviceName);
    }

    public async connect(deviceName: string): Promise<void> {
        const bootstrap = await this.oauth.connect();
        if (bootstrap.tokenType !== 'Bearer' || !bootstrap.scopes.includes('extension:connect')) {
            throw new Error('The bootstrap token is invalid.');
        }

        const registered = await this.devices.register(deviceName, bootstrap.accessToken);
        const keys = await this.deviceKeys.load(registered.id);
        if (keys === undefined) throw new Error('The registered device keys are unavailable.');
        const token = await this.oauth.authorizeDevice(keys);
        await this.credentials.save(registered.id, token);
    }
}

function parseStoredViewerToken(
    value: unknown,
    now: number,
): { readonly token: OAuthTokenSet; readonly expiresAt: number } | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    if (
        keys.some(
            (key) =>
                !['accessToken', 'expiresAt', 'refreshToken', 'scopes', 'tokenType'].includes(key),
        ) ||
        typeof record.accessToken !== 'string' ||
        record.tokenType !== 'DPoP' ||
        !Array.isArray(record.scopes) ||
        !record.scopes.every((scope) => typeof scope === 'string') ||
        !record.scopes.includes('ctx:authorize') ||
        record.scopes.includes('capsule:create') ||
        typeof record.expiresAt !== 'number' ||
        !Number.isFinite(record.expiresAt)
    ) {
        return undefined;
    }

    return {
        expiresAt: record.expiresAt,
        token: {
            accessToken: record.accessToken,
            tokenType: 'DPoP',
            expiresIn: Math.max(1, Math.floor((record.expiresAt - now) / 1000)),
            scopes: record.scopes,
            ...(typeof record.refreshToken === 'string'
                ? { refreshToken: record.refreshToken }
                : {}),
        },
    };
}
