import {
    parseCreatorSigningKeyRecoveryBundle,
    type CreatorSigningKeyRecoveryBundleV1,
} from './creator-signing-key-recovery.js';

export const CREATOR_WORKSPACE_ROOT = 'share-capsules';
export const CREATOR_WORKSPACE_VERSION = 1 as const;

export interface CreatorWorkspaceRecoveryStorage {
    get(keys: readonly string[]): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
}

export interface CreatorWorkspaceDirectoryHandle {
    readonly kind: 'directory';
    readonly name: string;
    getDirectoryHandle(
        name: string,
        options?: { readonly create?: boolean },
    ): Promise<CreatorWorkspaceDirectoryHandle>;
    getFileHandle(
        name: string,
        options?: { readonly create?: boolean },
    ): Promise<CreatorWorkspaceFileHandle>;
    queryPermission(options: { readonly mode: 'readwrite' }): Promise<PermissionState>;
}

export interface CreatorWorkspaceFileHandle {
    readonly kind: 'file';
    readonly name: string;
    getFile(): Promise<{ text(): Promise<string> }>;
    createWritable(): Promise<CreatorWorkspaceWritableFile>;
}

export interface CreatorWorkspaceWritableFile {
    write(data: Blob | ArrayBuffer): Promise<void>;
    close(): Promise<void>;
    abort(): Promise<void>;
}

export interface CreatorWorkspaceSelection {
    readonly keyId: string;
    readonly workspaceName: string;
    readonly parent: CreatorWorkspaceDirectoryHandle;
}

export interface CreatorWorkspaceSelectionStore {
    load(keyId: string): Promise<CreatorWorkspaceSelection | undefined>;
    save(selection: CreatorWorkspaceSelection): Promise<void>;
}

export interface CreatorWorkspaceStatus {
    readonly keyId: string;
    readonly workspaceName: string;
    readonly parentName: string;
    readonly writable: boolean;
}

export class CreatorWorkspaceError extends Error {
    public constructor(
        public readonly code: 'invalid_selection' | 'permission_required' | 'write_failed',
    ) {
        super(code);
        this.name = 'CreatorWorkspaceError';
    }
}

export class CreatorWorkspaceRecoveryStore {
    public constructor(private readonly storage: CreatorWorkspaceRecoveryStorage) {}

    public async save(bundleInput: unknown): Promise<CreatorSigningKeyRecoveryBundleV1> {
        const bundle = parseCreatorSigningKeyRecoveryBundle(bundleInput);
        await this.storage.set({ [recoveryStorageKey(bundle.key.id)]: bundle });
        return bundle;
    }

    public async load(keyId: string): Promise<CreatorSigningKeyRecoveryBundleV1 | undefined> {
        assertCreatorKeyId(keyId);
        const stored = await this.storage.get([recoveryStorageKey(keyId)]);
        const value = stored[recoveryStorageKey(keyId)];
        if (value === undefined) return undefined;
        const bundle = parseCreatorSigningKeyRecoveryBundle(value);
        if (bundle.key.id !== keyId) throw new Error('Workspace recovery key does not match.');
        return bundle;
    }

    public async has(keyId: string): Promise<boolean> {
        return (await this.load(keyId)) !== undefined;
    }
}

export class IndexedDbCreatorWorkspaceSelectionStore implements CreatorWorkspaceSelectionStore {
    public constructor(
        private readonly databaseName = 'share-capsules-workspaces',
        private readonly storeName = 'workspace-selections',
    ) {}

    public async load(keyId: string): Promise<CreatorWorkspaceSelection | undefined> {
        assertCreatorKeyId(keyId);
        const database = await this.open();
        try {
            const value = await requestResult(
                database
                    .transaction(this.storeName, 'readonly')
                    .objectStore(this.storeName)
                    .get(keyId),
            );
            return storedSelection(value);
        } finally {
            database.close();
        }
    }

    public async save(selection: CreatorWorkspaceSelection): Promise<void> {
        const validated = storedSelection(selection);
        if (validated === undefined) throw new Error('Invalid Creator workspace selection.');
        const database = await this.open();
        try {
            const transaction = database.transaction(this.storeName, 'readwrite');
            transaction.objectStore(this.storeName).put(validated);
            await transactionDone(transaction);
        } finally {
            database.close();
        }
    }

    private open(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.databaseName, 1);
            request.addEventListener('upgradeneeded', () => {
                if (!request.result.objectStoreNames.contains(this.storeName)) {
                    request.result.createObjectStore(this.storeName, { keyPath: 'keyId' });
                }
            });
            request.addEventListener('success', () => resolve(request.result), { once: true });
            request.addEventListener('error', () => reject(request.error), { once: true });
            request.addEventListener(
                'blocked',
                () => reject(new Error('Workspace store blocked.')),
                {
                    once: true,
                },
            );
        });
    }
}

export class FileSystemCreatorWorkspace {
    public constructor(
        private readonly recovery: CreatorWorkspaceRecoveryStore,
        private readonly selections: CreatorWorkspaceSelectionStore,
    ) {}

    public async status(
        keyId: string,
        preferredWorkspaceName?: string,
    ): Promise<CreatorWorkspaceStatus | undefined> {
        const selection = await this.selections.load(keyId);
        if (selection === undefined) return undefined;
        if (
            preferredWorkspaceName !== undefined &&
            preferredWorkspaceName !== selection.workspaceName &&
            (await selection.parent.queryPermission({ mode: 'readwrite' })) === 'granted'
        ) {
            return this.select(keyId, preferredWorkspaceName, selection.parent);
        }

        return {
            keyId,
            workspaceName: selection.workspaceName,
            parentName: selection.parent.name,
            writable: (await selection.parent.queryPermission({ mode: 'readwrite' })) === 'granted',
        };
    }

    public async select(
        keyId: string,
        workspaceName: string,
        parent: CreatorWorkspaceDirectoryHandle,
    ): Promise<CreatorWorkspaceStatus> {
        assertCreatorKeyId(keyId);
        assertWorkspaceName(workspaceName);
        if (!isDirectoryHandle(parent)) throw new Error('Invalid workspace parent directory.');
        if ((await parent.queryPermission({ mode: 'readwrite' })) !== 'granted') {
            throw new Error('The selected directory is not writable.');
        }
        await this.selections.save({ keyId, workspaceName, parent });
        await workspaceDirectory(parent, workspaceName);
        return { keyId, workspaceName, parentName: parent.name, writable: true };
    }

    public async saveAndDownload(bundleInput: CreatorSigningKeyRecoveryBundleV1): Promise<void> {
        const bundle = parseCreatorSigningKeyRecoveryBundle(bundleInput);
        await this.writeWorkspaceFiles(bundle);
        await this.recovery.save(bundle);
    }

    public hasRecoveryBundle(keyId: string): Promise<boolean> {
        return this.restoreRecoveryBundleFromWorkspace(keyId);
    }

    public async download(
        signingKeyId: string,
        filename: string,
        archive: Uint8Array,
    ): Promise<void> {
        assertCapsuleFilename(filename);
        const bundle = await this.recovery.load(signingKeyId);
        if (bundle === undefined) throw new Error('Workspace recovery bundle is unavailable.');
        const directory = await this.writeWorkspaceFiles(bundle);
        const capsules = await directory.getDirectoryHandle('capsules', { create: true });
        const destination = await uniqueFileHandle(capsules, filename);
        await writeFile(destination, ownedBuffer(archive));
    }

    private async writeWorkspaceFiles(
        bundle: CreatorSigningKeyRecoveryBundleV1,
    ): Promise<CreatorWorkspaceDirectoryHandle> {
        const selection = await this.requireWritableSelection(bundle.key.id);
        const directory = await workspaceDirectory(selection.parent, selection.workspaceName);
        await writeFile(
            await directory.getFileHandle('workspace.json', { create: true }),
            jsonBlob(creatorWorkspaceManifest(bundle, selection.workspaceName)),
        );
        const recovery = await directory.getDirectoryHandle('recovery', { create: true });
        await writeFile(
            await recovery.getFileHandle(recoveryFilename(bundle.key.id), { create: true }),
            jsonBlob(bundle),
        );
        return directory;
    }

    private async restoreRecoveryBundleFromWorkspace(keyId: string): Promise<boolean> {
        try {
            const local = await this.recovery.load(keyId);
            if (local !== undefined) {
                await this.writeWorkspaceFiles(local);
                return true;
            }
        } catch {
            // Ignore stale or malformed extension-local recovery cache and fall back to the
            // selected workspace. Older interrupted builds could leave local recovery metadata
            // that does not parse under the current contract.
        }
        const selection = await this.selections.load(keyId);
        if (
            selection === undefined ||
            (await selection.parent.queryPermission({ mode: 'readwrite' })) !== 'granted'
        ) {
            return false;
        }

        try {
            const directory = await workspaceDirectory(selection.parent, selection.workspaceName);
            const recovery = await directory.getDirectoryHandle('recovery');
            const handle = await recovery.getFileHandle(recoveryFilename(keyId));
            const bundle = parseCreatorSigningKeyRecoveryBundle(
                JSON.parse(await (await handle.getFile()).text()) as unknown,
            );
            if (bundle.key.id !== keyId) return false;
            await this.recovery.save(bundle);
            return true;
        } catch {
            return false;
        }
    }

    private async requireWritableSelection(keyId: string): Promise<CreatorWorkspaceSelection> {
        const selection = await this.selections.load(keyId);
        if (selection === undefined) {
            throw new CreatorWorkspaceError('invalid_selection');
        }
        if ((await selection.parent.queryPermission({ mode: 'readwrite' })) !== 'granted') {
            throw new CreatorWorkspaceError('permission_required');
        }
        return selection;
    }
}

export function creatorWorkspaceManifest(
    bundleInput: unknown,
    workspaceName: string,
): Readonly<Record<string, unknown>> {
    assertWorkspaceName(workspaceName);
    const bundle = parseCreatorSigningKeyRecoveryBundle(bundleInput);
    return Object.freeze({
        type: 'share-capsules-workspace',
        version: CREATOR_WORKSPACE_VERSION,
        workspace_id: bundle.key.id,
        name: workspaceName,
        signing_key: Object.freeze({
            id: bundle.key.id,
            algorithm: bundle.key.algorithm,
            public_key: bundle.key.public_key,
        }),
    });
}

export function creatorWorkspaceNameFromAccountLabel(label: string): string {
    const normalized = label
        .normalize('NFKD')
        .replaceAll(/[^A-Za-z0-9]+/gu, '-')
        .replaceAll(/^-|-$/gu, '')
        .toLowerCase()
        .slice(0, 64);

    return isCreatorWorkspaceName(normalized) ? normalized : 'share-capsules-account';
}

export function isCreatorWorkspaceName(value: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value) && value.length <= 64;
}

function assertWorkspaceName(value: string): void {
    if (!isCreatorWorkspaceName(value)) {
        throw new Error('Workspace name must use lowercase letters, numbers, and hyphens.');
    }
}

async function workspaceDirectory(
    parent: CreatorWorkspaceDirectoryHandle,
    workspaceName: string,
): Promise<CreatorWorkspaceDirectoryHandle> {
    const root = await parent.getDirectoryHandle(CREATOR_WORKSPACE_ROOT, { create: true });
    return root.getDirectoryHandle(workspaceName, { create: true });
}

async function uniqueFileHandle(
    directory: CreatorWorkspaceDirectoryHandle,
    filename: string,
): Promise<CreatorWorkspaceFileHandle> {
    const extension = '.capsule';
    const stem = filename.slice(0, -extension.length);
    for (let index = 1; index <= 10_000; index++) {
        const candidate = index === 1 ? filename : `${stem}-${index}${extension}`;
        try {
            await directory.getFileHandle(candidate);
        } catch (error) {
            if (isNotFound(error)) {
                return directory.getFileHandle(candidate, { create: true });
            }
            throw error;
        }
    }
    throw new Error('No available Capsule filename.');
}

async function writeFile(
    handle: CreatorWorkspaceFileHandle,
    data: Blob | ArrayBuffer,
): Promise<void> {
    let writable: CreatorWorkspaceWritableFile;
    try {
        writable = await handle.createWritable();
    } catch {
        throw new CreatorWorkspaceError('write_failed');
    }
    try {
        await writable.write(data);
        await writable.close();
    } catch (error) {
        await writable.abort().catch(() => undefined);
        if (error instanceof CreatorWorkspaceError) throw error;
        throw new CreatorWorkspaceError('write_failed');
    }
}

function storedSelection(value: unknown): CreatorWorkspaceSelection | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
    const candidate = value as Partial<CreatorWorkspaceSelection>;
    if (
        typeof candidate.keyId !== 'string' ||
        !/^creator_[a-f0-9]{32}$/u.test(candidate.keyId) ||
        typeof candidate.workspaceName !== 'string' ||
        !isCreatorWorkspaceName(candidate.workspaceName) ||
        !isDirectoryHandle(candidate.parent)
    ) {
        return undefined;
    }
    return candidate as CreatorWorkspaceSelection;
}

function isDirectoryHandle(value: unknown): value is CreatorWorkspaceDirectoryHandle {
    return (
        typeof value === 'object' &&
        value !== null &&
        (value as { readonly kind?: unknown }).kind === 'directory' &&
        typeof (value as { readonly name?: unknown }).name === 'string' &&
        typeof (value as { readonly getDirectoryHandle?: unknown }).getDirectoryHandle ===
            'function' &&
        typeof (value as { readonly getFileHandle?: unknown }).getFileHandle === 'function' &&
        typeof (value as { readonly queryPermission?: unknown }).queryPermission === 'function'
    );
}

function recoveryStorageKey(keyId: string): string {
    return `creator_workspace_recovery_${keyId}`;
}

function recoveryFilename(keyId: string): string {
    assertCreatorKeyId(keyId);
    return `${keyId.replace('_', '-')}.encrypted.json`;
}

function assertCreatorKeyId(keyId: string): void {
    if (!/^creator_[a-f0-9]{32}$/u.test(keyId)) throw new Error('Invalid creator signing-key ID.');
}

function assertCapsuleFilename(filename: string): void {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,79})\.capsule$/u.test(filename)) {
        throw new Error('Invalid workspace Capsule filename.');
    }
}

function jsonBlob(value: unknown): Blob {
    return new Blob([JSON.stringify(value, undefined, 2)], { type: 'application/json' });
}

function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
}

function isNotFound(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'NotFoundError';
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.addEventListener('success', () => resolve(request.result), { once: true });
        request.addEventListener('error', () => reject(request.error), { once: true });
    });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        transaction.addEventListener('complete', () => resolve(), { once: true });
        transaction.addEventListener('abort', () => reject(transaction.error), { once: true });
        transaction.addEventListener('error', () => reject(transaction.error), { once: true });
    });
}
