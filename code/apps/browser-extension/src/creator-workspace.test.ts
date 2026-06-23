import { encodeBase64Url } from '@sharecapsules/capsule-core';
import { describe, expect, it } from 'vitest';

import type { CreatorSigningKeyRecoveryBundleV1 } from './creator-signing-key-recovery.js';
import {
    CreatorWorkspaceRecoveryStore,
    FileSystemCreatorWorkspace,
    creatorWorkspaceNameFromAccountLabel,
    creatorWorkspaceManifest,
    isCreatorWorkspaceName,
    type CreatorWorkspaceDirectoryHandle,
    type CreatorWorkspaceFileHandle,
    type CreatorWorkspaceSelection,
    type CreatorWorkspaceSelectionStore,
    type CreatorWorkspaceWritableFile,
} from './creator-workspace.js';

const KEY_ID = 'creator_0123456789abcdef0123456789abcdef';

describe('Creator workspace', () => {
    it('uses validated lowercase kebab-case workspace names', () => {
        expect(creatorWorkspaceNameFromAccountLabel('Creator.User+test@example.com')).toBe(
            'creator-user-test-example-com',
        );
        expect(isCreatorWorkspaceName('family-photos')).toBe(true);
        expect(isCreatorWorkspaceName('Family Photos')).toBe(false);
        expect(isCreatorWorkspaceName('../photos')).toBe(false);
    });

    it('retains only a validated encrypted recovery bundle for workspace repair', async () => {
        const storage = new MemoryStorage();
        const store = new CreatorWorkspaceRecoveryStore(storage);
        const bundle = recoveryBundle();

        await expect(store.save(bundle)).resolves.toEqual(bundle);
        await expect(store.load(KEY_ID)).resolves.toEqual(bundle);
        expect(JSON.stringify(storage.values)).not.toContain('recovery-code');
        expect(creatorWorkspaceManifest(bundle, 'family-photos')).toEqual({
            type: 'share-capsules-workspace',
            version: 1,
            workspace_id: KEY_ID,
            name: 'family-photos',
            signing_key: {
                id: KEY_ID,
                algorithm: 'Ed25519',
                public_key: bundle.key.public_key,
            },
        });
    });

    it('repairs workspace metadata and recovery before writing unique Capsules', async () => {
        const parent = new MemoryDirectory('Documents');
        const recovery = new CreatorWorkspaceRecoveryStore(new MemoryStorage());
        const selections = new MemorySelectionStore();
        const workspace = new FileSystemCreatorWorkspace(recovery, selections);
        const bundle = recoveryBundle();

        await expect(workspace.status(KEY_ID)).resolves.toBeUndefined();
        await expect(workspace.select(KEY_ID, 'family-photos', parent)).resolves.toEqual({
            keyId: KEY_ID,
            workspaceName: 'family-photos',
            parentName: 'Documents',
            writable: true,
        });
        await workspace.saveAndDownload(bundle);
        await workspace.download(KEY_ID, 'summer.capsule', Uint8Array.from([1, 2, 3]));
        await workspace.download(KEY_ID, 'summer.capsule', Uint8Array.from([4, 5, 6]));

        const directory = parent.directory('share-capsules').directory('family-photos');
        expect(directory.fileNames()).toEqual(['workspace.json']);
        expect(directory.directory('recovery').fileNames()).toEqual([
            'creator-0123456789abcdef0123456789abcdef.encrypted.json',
        ]);
        expect(directory.directory('capsules').fileNames()).toEqual([
            'summer-2.capsule',
            'summer.capsule',
        ]);
        expect(await directory.file('workspace.json').text()).toContain('family-photos');

        const restoredRecovery = new CreatorWorkspaceRecoveryStore(new MemoryStorage());
        const restoredWorkspace = new FileSystemCreatorWorkspace(restoredRecovery, selections);
        await expect(restoredWorkspace.hasRecoveryBundle(KEY_ID)).resolves.toBe(true);
        await expect(restoredRecovery.load(KEY_ID)).resolves.toEqual(bundle);
    });

    it('copies locally remembered recovery materials into the selected workspace', async () => {
        const parent = new MemoryDirectory('Documents');
        const recovery = new CreatorWorkspaceRecoveryStore(new MemoryStorage());
        const selections = new MemorySelectionStore();
        const workspace = new FileSystemCreatorWorkspace(recovery, selections);
        const bundle = recoveryBundle();

        await recovery.save(bundle);
        await workspace.select(KEY_ID, 'creator-example-com', parent);

        await expect(workspace.hasRecoveryBundle(KEY_ID)).resolves.toBe(true);

        const directory = parent.directory('share-capsules').directory('creator-example-com');
        expect(directory.fileNames()).toEqual(['workspace.json']);
        expect(directory.directory('recovery').fileNames()).toEqual([
            'creator-0123456789abcdef0123456789abcdef.encrypted.json',
        ]);
    });

    it('migrates an old signing-key workspace name to the preferred account folder', async () => {
        const parent = new MemoryDirectory('Documents');
        const recovery = new CreatorWorkspaceRecoveryStore(new MemoryStorage());
        const selections = new MemorySelectionStore();
        const workspace = new FileSystemCreatorWorkspace(recovery, selections);

        await workspace.select(KEY_ID, 'workspace-01234567', parent);
        await expect(workspace.status(KEY_ID, 'creator-example-com')).resolves.toEqual({
            keyId: KEY_ID,
            workspaceName: 'creator-example-com',
            parentName: 'Documents',
            writable: true,
        });
        await expect(workspace.status(KEY_ID)).resolves.toMatchObject({
            workspaceName: 'creator-example-com',
        });
    });

    it('ignores malformed local recovery cache and creates a replacement from workspace absence', async () => {
        const storage = new MemoryStorage();
        storage.values.creator_workspace_recovery_creator_0123456789abcdef0123456789abcdef = {
            bad: true,
        };
        const recovery = new CreatorWorkspaceRecoveryStore(storage);
        const selections = new MemorySelectionStore();
        const workspace = new FileSystemCreatorWorkspace(recovery, selections);
        await selections.save({
            keyId: KEY_ID,
            workspaceName: 'creator-example-com',
            parent: new MemoryDirectory('Documents'),
        });

        await expect(workspace.hasRecoveryBundle(KEY_ID)).resolves.toBe(false);
    });

    it('does not mark recovery available when workspace writing fails', async () => {
        const recovery = new CreatorWorkspaceRecoveryStore(new MemoryStorage());
        const selections = new MemorySelectionStore();
        const workspace = new FileSystemCreatorWorkspace(recovery, selections);
        await selections.save({
            keyId: KEY_ID,
            workspaceName: 'creator-example-com',
            parent: new PermissionDeniedDirectory('Documents'),
        });

        await expect(workspace.saveAndDownload(recoveryBundle())).rejects.toThrow();
        await expect(recovery.load(KEY_ID)).resolves.toBeUndefined();
        await expect(workspace.hasRecoveryBundle(KEY_ID)).resolves.toBe(false);
    });
});

class MemoryStorage {
    public readonly values: Record<string, unknown> = {};

    public async get(keys: readonly string[]): Promise<Record<string, unknown>> {
        return Object.fromEntries(keys.map((key) => [key, this.values[key]]));
    }

    public async set(items: Record<string, unknown>): Promise<void> {
        Object.assign(this.values, items);
    }
}

class MemorySelectionStore implements CreatorWorkspaceSelectionStore {
    private readonly selections = new Map<string, CreatorWorkspaceSelection>();

    public async load(keyId: string): Promise<CreatorWorkspaceSelection | undefined> {
        return this.selections.get(keyId);
    }

    public async save(selection: CreatorWorkspaceSelection): Promise<void> {
        this.selections.set(selection.keyId, selection);
    }
}

class MemoryDirectory implements CreatorWorkspaceDirectoryHandle {
    public readonly kind = 'directory' as const;
    private readonly directories = new Map<string, MemoryDirectory>();
    private readonly files = new Map<string, MemoryFile>();

    public constructor(public readonly name: string) {}

    public async queryPermission(): Promise<PermissionState> {
        return 'granted';
    }

    public async getDirectoryHandle(
        name: string,
        options: { readonly create?: boolean } = {},
    ): Promise<MemoryDirectory> {
        const existing = this.directories.get(name);
        if (existing !== undefined) return existing;
        if (options.create !== true) throw new DOMException('Not found', 'NotFoundError');
        const created = new MemoryDirectory(name);
        this.directories.set(name, created);
        return created;
    }

    public async getFileHandle(
        name: string,
        options: { readonly create?: boolean } = {},
    ): Promise<MemoryFile> {
        const existing = this.files.get(name);
        if (existing !== undefined) return existing;
        if (options.create !== true) throw new DOMException('Not found', 'NotFoundError');
        const created = new MemoryFile(name);
        this.files.set(name, created);
        return created;
    }

    public directory(name: string): MemoryDirectory {
        const directory = this.directories.get(name);
        if (directory === undefined) throw new Error(`Missing directory ${name}`);
        return directory;
    }

    public file(name: string): MemoryFile {
        const file = this.files.get(name);
        if (file === undefined) throw new Error(`Missing file ${name}`);
        return file;
    }

    public fileNames(): string[] {
        return [...this.files.keys()].sort();
    }
}

class PermissionDeniedDirectory extends MemoryDirectory {
    public override async queryPermission(): Promise<PermissionState> {
        return 'denied';
    }
}

class MemoryFile implements CreatorWorkspaceFileHandle {
    public readonly kind = 'file' as const;
    private contents: Blob | ArrayBuffer = new ArrayBuffer(0);

    public constructor(public readonly name: string) {}

    public async createWritable(): Promise<CreatorWorkspaceWritableFile> {
        return {
            write: async (data) => {
                this.contents = data;
            },
            close: async () => undefined,
            abort: async () => undefined,
        };
    }

    public async getFile(): Promise<{ text(): Promise<string> }> {
        return { text: () => this.text() };
    }

    public async text(): Promise<string> {
        return this.contents instanceof Blob
            ? this.contents.text()
            : new TextDecoder().decode(this.contents);
    }
}

function recoveryBundle(): CreatorSigningKeyRecoveryBundleV1 {
    return {
        type: 'share-capsules-creator-key-recovery',
        version: 1,
        key: {
            id: KEY_ID,
            algorithm: 'Ed25519',
            public_key: encoded(32),
            created_at: '2026-06-22T12:00:00.000Z',
        },
        kdf: { algorithm: 'HKDF-SHA-256', salt: encoded(16) },
        encryption: { algorithm: 'AES-256-GCM', nonce: encoded(12) },
        ciphertext: encoded(32),
    };
}

function encoded(length: number): string {
    return encodeBase64Url(new Uint8Array(length).fill(7));
}
