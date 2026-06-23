import { decodeBase64Url, encodeBase64Url } from '@sharecapsules/capsule-core';

export const CREATOR_SIGNING_ALGORITHM = 'Ed25519' as const;

export type CreatorSigningKeyStatus = 'active' | 'retiring' | 'revoked' | 'expired';
export type CreatorSigningKeyRecoveryStatus = 'required' | 'confirmed';

export interface CreatorSigningKeyRecord {
    readonly id: string;
    readonly algorithm: typeof CREATOR_SIGNING_ALGORITHM;
    readonly publicKey: string;
    readonly privateKey: CryptoKey;
    readonly status: CreatorSigningKeyStatus;
    readonly createdAt: string;
    readonly statusChangedAt: string;
    readonly recoveryStatus: CreatorSigningKeyRecoveryStatus;
    readonly recoveryConfirmedAt?: string;
}

export type CreatorSigningKeySummary = Omit<CreatorSigningKeyRecord, 'privateKey'>;

export interface CreatorSigningKeyStore {
    addAsActive(record: CreatorSigningKeyRecord): Promise<void>;
    list(): Promise<readonly CreatorSigningKeyRecord[]>;
    transition(
        id: string,
        allowedCurrentStatuses: readonly CreatorSigningKeyStatus[],
        status: CreatorSigningKeyStatus,
        changedAt: string,
    ): Promise<CreatorSigningKeyRecord | undefined>;
    confirmRecovery(id: string, confirmedAt: string): Promise<CreatorSigningKeyRecord | undefined>;
}

export interface RecoveredCreatorSigningKey {
    readonly id: string;
    readonly algorithm: typeof CREATOR_SIGNING_ALGORITHM;
    readonly publicKey: string;
    readonly privateKey: CryptoKey;
    readonly createdAt: string;
}

export interface CreatorSigningKeyClock {
    now(): Date;
}

export class CreatorSigningKeyError extends Error {
    public constructor(
        public readonly code:
            | 'generation_failed'
            | 'invalid_transition'
            | 'key_not_found'
            | 'no_active_key'
            | 'recovery_required'
            | 'storage_failed',
    ) {
        super(code);
        this.name = 'CreatorSigningKeyError';
    }
}

export class CreatorSigningKeyRing {
    public constructor(
        private readonly store: CreatorSigningKeyStore,
        private readonly cryptography: Pick<Crypto, 'randomUUID' | 'subtle'> = crypto,
        private readonly clock: CreatorSigningKeyClock = { now: () => new Date() },
    ) {}

    public async generate(): Promise<CreatorSigningKeySummary> {
        let pair: CryptoKeyPair;
        let publicKey: string;

        try {
            const generated = await this.cryptography.subtle.generateKey(
                { name: CREATOR_SIGNING_ALGORITHM },
                true,
                ['sign', 'verify'],
            );
            if (!isKeyPair(generated)) throw new CreatorSigningKeyError('generation_failed');
            const publicBytes = new Uint8Array(
                await this.cryptography.subtle.exportKey('raw', generated.publicKey),
            );
            if (publicBytes.byteLength !== 32) {
                throw new CreatorSigningKeyError('generation_failed');
            }
            pair = generated;
            publicKey = encodeBase64Url(publicBytes);
        } catch (error) {
            if (error instanceof CreatorSigningKeyError) throw error;
            throw new CreatorSigningKeyError('generation_failed');
        }

        let id: string;
        let now: string;
        try {
            id = `creator_${this.cryptography.randomUUID().replaceAll('-', '')}`;
            now = canonicalInstant(this.clock.now());
        } catch {
            throw new CreatorSigningKeyError('generation_failed');
        }
        const record: CreatorSigningKeyRecord = Object.freeze({
            id,
            algorithm: CREATOR_SIGNING_ALGORITHM,
            publicKey,
            privateKey: pair.privateKey,
            status: 'active',
            createdAt: now,
            statusChangedAt: now,
            recoveryStatus: 'required',
        });

        try {
            await this.store.addAsActive(record);
        } catch {
            throw new CreatorSigningKeyError('storage_failed');
        }

        return summary(record);
    }

    public async list(): Promise<readonly CreatorSigningKeySummary[]> {
        try {
            const records = await this.store.list();
            return Object.freeze(
                [...records]
                    .sort(
                        (left, right) =>
                            right.createdAt.localeCompare(left.createdAt) ||
                            right.id.localeCompare(left.id),
                    )
                    .map(summary),
            );
        } catch {
            throw new CreatorSigningKeyError('storage_failed');
        }
    }

    public async activeSigningKey(): Promise<CreatorSigningKeyRecord> {
        let records: readonly CreatorSigningKeyRecord[];
        try {
            records = await this.store.list();
        } catch {
            throw new CreatorSigningKeyError('storage_failed');
        }
        const active = records.filter((record) => record.status === 'active');
        const selected = active[0];
        if (active.length !== 1 || selected === undefined) {
            throw new CreatorSigningKeyError('no_active_key');
        }

        return selected;
    }

    public async publicationSigningKey(): Promise<CreatorSigningKeyRecord> {
        const active = await this.activeSigningKey();
        if (active.recoveryStatus !== 'confirmed') {
            throw new CreatorSigningKeyError('recovery_required');
        }

        return active;
    }

    public async confirmRecoverySaved(id: string): Promise<CreatorSigningKeySummary> {
        let confirmed: CreatorSigningKeyRecord | undefined;
        try {
            confirmed = await this.store.confirmRecovery(id, canonicalInstant(this.clock.now()));
        } catch {
            throw new CreatorSigningKeyError('storage_failed');
        }
        if (confirmed === undefined) {
            const record = (await this.list()).find((key) => key.id === id);
            if (record === undefined) throw new CreatorSigningKeyError('key_not_found');
            if (record.status === 'active' && record.recoveryStatus === 'confirmed') {
                return record;
            }
            throw new CreatorSigningKeyError('invalid_transition');
        }

        return summary(confirmed);
    }

    public async restore(recovered: RecoveredCreatorSigningKey): Promise<CreatorSigningKeySummary> {
        const now = canonicalInstant(this.clock.now());
        const record: CreatorSigningKeyRecord = Object.freeze({
            ...recovered,
            status: 'active',
            statusChangedAt: now,
            recoveryStatus: 'confirmed',
            recoveryConfirmedAt: now,
        });
        if (storedRecord(record) === undefined) {
            throw new CreatorSigningKeyError('generation_failed');
        }
        try {
            await this.store.addAsActive(record);
        } catch {
            throw new CreatorSigningKeyError('storage_failed');
        }

        return summary(record);
    }

    public revoke(id: string): Promise<CreatorSigningKeySummary> {
        return this.changeStatus(id, ['active', 'retiring'], 'revoked');
    }

    public expire(id: string): Promise<CreatorSigningKeySummary> {
        return this.changeStatus(id, ['retiring'], 'expired');
    }

    private async changeStatus(
        id: string,
        allowedCurrentStatuses: readonly CreatorSigningKeyStatus[],
        status: CreatorSigningKeyStatus,
    ): Promise<CreatorSigningKeySummary> {
        let changed: CreatorSigningKeyRecord | undefined;
        try {
            changed = await this.store.transition(
                id,
                allowedCurrentStatuses,
                status,
                canonicalInstant(this.clock.now()),
            );
        } catch {
            throw new CreatorSigningKeyError('storage_failed');
        }
        if (changed === undefined) {
            const exists = (await this.list()).some((record) => record.id === id);
            throw new CreatorSigningKeyError(exists ? 'invalid_transition' : 'key_not_found');
        }

        return summary(changed);
    }
}

export class IndexedDbCreatorSigningKeyStore implements CreatorSigningKeyStore {
    public constructor(
        private readonly databaseName = 'share-capsules-creator',
        private readonly storeName = 'creator-signing-keys',
    ) {}

    public async addAsActive(record: CreatorSigningKeyRecord): Promise<void> {
        const database = await this.open();
        try {
            await new Promise<void>((resolve, reject) => {
                const transaction = database.transaction(this.storeName, 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.getAll();
                request.onsuccess = () => {
                    for (const existing of storedRecords(request.result)) {
                        if (existing.status !== 'active') continue;
                        store.put({
                            ...existing,
                            status: 'retiring',
                            statusChangedAt: record.statusChangedAt,
                        } satisfies CreatorSigningKeyRecord);
                    }
                    store.add(record);
                };
                request.onerror = () => transaction.abort();
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error);
            });
        } finally {
            database.close();
        }
    }

    public async list(): Promise<readonly CreatorSigningKeyRecord[]> {
        const database = await this.open();
        try {
            return await new Promise<readonly CreatorSigningKeyRecord[]>((resolve, reject) => {
                const request = database
                    .transaction(this.storeName, 'readonly')
                    .objectStore(this.storeName)
                    .getAll();
                request.onsuccess = () => resolve(storedRecords(request.result));
                request.onerror = () => reject(request.error);
            });
        } finally {
            database.close();
        }
    }

    public async transition(
        id: string,
        allowedCurrentStatuses: readonly CreatorSigningKeyStatus[],
        status: CreatorSigningKeyStatus,
        changedAt: string,
    ): Promise<CreatorSigningKeyRecord | undefined> {
        const database = await this.open();
        try {
            return await new Promise<CreatorSigningKeyRecord | undefined>((resolve, reject) => {
                const transaction = database.transaction(this.storeName, 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(id);
                let changed: CreatorSigningKeyRecord | undefined;
                request.onsuccess = () => {
                    const current = storedRecord(request.result);
                    if (current === undefined || !allowedCurrentStatuses.includes(current.status)) {
                        return;
                    }
                    changed = {
                        ...current,
                        status,
                        statusChangedAt: changedAt,
                    };
                    store.put(changed);
                };
                request.onerror = () => transaction.abort();
                transaction.oncomplete = () => resolve(changed);
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error);
            });
        } finally {
            database.close();
        }
    }

    public async confirmRecovery(
        id: string,
        confirmedAt: string,
    ): Promise<CreatorSigningKeyRecord | undefined> {
        const database = await this.open();
        try {
            return await new Promise<CreatorSigningKeyRecord | undefined>((resolve, reject) => {
                const transaction = database.transaction(this.storeName, 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(id);
                let confirmed: CreatorSigningKeyRecord | undefined;
                request.onsuccess = () => {
                    const current = storedRecord(request.result);
                    if (
                        current === undefined ||
                        current.status !== 'active' ||
                        current.recoveryStatus !== 'required'
                    ) {
                        return;
                    }
                    confirmed = {
                        ...current,
                        recoveryStatus: 'confirmed',
                        recoveryConfirmedAt: confirmedAt,
                    };
                    store.put(confirmed);
                };
                request.onerror = () => transaction.abort();
                transaction.oncomplete = () => resolve(confirmed);
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error);
            });
        } finally {
            database.close();
        }
    }

    private async open(): Promise<IDBDatabase> {
        return new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(this.databaseName, 1);
            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(this.storeName)) {
                    database.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

function summary(record: CreatorSigningKeyRecord): CreatorSigningKeySummary {
    return Object.freeze({
        id: record.id,
        algorithm: record.algorithm,
        publicKey: record.publicKey,
        status: record.status,
        createdAt: record.createdAt,
        statusChangedAt: record.statusChangedAt,
        recoveryStatus: record.recoveryStatus,
        ...(record.recoveryConfirmedAt === undefined
            ? {}
            : { recoveryConfirmedAt: record.recoveryConfirmedAt }),
    });
}

function canonicalInstant(value: Date): string {
    if (!Number.isFinite(value.getTime())) throw new CreatorSigningKeyError('generation_failed');
    return value.toISOString();
}

function isKeyPair(value: CryptoKey | CryptoKeyPair): value is CryptoKeyPair {
    return 'privateKey' in value && 'publicKey' in value;
}

function storedRecords(value: unknown): readonly CreatorSigningKeyRecord[] {
    if (!Array.isArray(value)) throw new CreatorSigningKeyError('storage_failed');
    const records: CreatorSigningKeyRecord[] = [];
    for (const valueRecord of value) {
        const record = storedRecord(valueRecord);
        if (record === undefined) throw new CreatorSigningKeyError('storage_failed');
        records.push(record);
    }

    return records;
}

function storedRecord(value: unknown): CreatorSigningKeyRecord | undefined {
    if (typeof value !== 'object' || value === null) return undefined;
    const candidate = value as Partial<CreatorSigningKeyRecord>;
    if (
        typeof candidate.id !== 'string' ||
        !/^creator_[a-f0-9]{32}$/u.test(candidate.id) ||
        candidate.algorithm !== CREATOR_SIGNING_ALGORITHM ||
        typeof candidate.publicKey !== 'string' ||
        !isPublicKey(candidate.publicKey) ||
        !(candidate.privateKey instanceof CryptoKey) ||
        candidate.privateKey.type !== 'private' ||
        candidate.privateKey.algorithm.name !== CREATOR_SIGNING_ALGORITHM ||
        candidate.privateKey.usages.length !== 1 ||
        candidate.privateKey.usages[0] !== 'sign' ||
        !isStatus(candidate.status) ||
        !isRecoveryStatus(candidate.recoveryStatus) ||
        typeof candidate.createdAt !== 'string' ||
        !isCanonicalInstant(candidate.createdAt) ||
        typeof candidate.statusChangedAt !== 'string' ||
        !isCanonicalInstant(candidate.statusChangedAt) ||
        candidate.statusChangedAt < candidate.createdAt ||
        (candidate.recoveryStatus === 'required' && candidate.recoveryConfirmedAt !== undefined) ||
        (candidate.recoveryStatus === 'confirmed' &&
            (typeof candidate.recoveryConfirmedAt !== 'string' ||
                !isCanonicalInstant(candidate.recoveryConfirmedAt) ||
                candidate.recoveryConfirmedAt < candidate.createdAt))
    ) {
        return undefined;
    }

    return candidate as CreatorSigningKeyRecord;
}

function isStatus(value: unknown): value is CreatorSigningKeyStatus {
    return value === 'active' || value === 'retiring' || value === 'revoked' || value === 'expired';
}

function isRecoveryStatus(value: unknown): value is CreatorSigningKeyRecoveryStatus {
    return value === 'required' || value === 'confirmed';
}

function isPublicKey(value: string): boolean {
    try {
        return decodeBase64Url(value).byteLength === 32;
    } catch {
        return false;
    }
}

function isCanonicalInstant(value: string): boolean {
    const milliseconds = Date.parse(value);
    return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
}
