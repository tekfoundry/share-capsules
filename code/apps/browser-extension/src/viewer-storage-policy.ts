import { VIEWER_CREDENTIAL_STORAGE_KEYS } from './viewer-account-connection.js';
import { VIEWER_DISCLOSURE_CONSENT_STORAGE_KEY } from './viewer-consent.js';

export interface ViewerExtensionStorage {
    get(keys: readonly string[]): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
}

export const VIEWER_ALLOWED_STORAGE_KEYS = Object.freeze([
    ...VIEWER_CREDENTIAL_STORAGE_KEYS,
    VIEWER_DISCLOSURE_CONSENT_STORAGE_KEY,
]);

const VIEWER_ALLOWED_STORAGE_KEY_SET = new Set<string>(VIEWER_ALLOWED_STORAGE_KEYS);

export function guardedViewerStorage(storage: ViewerExtensionStorage): ViewerExtensionStorage {
    return Object.freeze({
        get: async (keys: readonly string[]) => {
            assertAllowedViewerStorageKeys(keys);
            return storage.get(keys);
        },
        set: async (items: Record<string, unknown>) => {
            assertAllowedViewerStorageKeys(Object.keys(items));
            return storage.set(items);
        },
    });
}

export function assertAllowedViewerStorageKeys(keys: readonly string[]): void {
    for (const key of keys) {
        if (!VIEWER_ALLOWED_STORAGE_KEY_SET.has(key)) {
            throw new Error(`Viewer storage key is not approved: ${key}`);
        }
    }
}
