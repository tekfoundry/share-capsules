import { describe, expect, it } from 'vitest';

import {
    CreatorSigningKeyError,
    CreatorSigningKeyRing,
    type CreatorSigningKeyRecord,
    type CreatorSigningKeyStatus,
    type CreatorSigningKeyStore,
} from './creator-signing-key.js';

describe('local creator signing-key ring', () => {
    it('generates an active purpose-bound Ed25519 record without exposing the private key', async () => {
        const store = new MemoryCreatorSigningKeyStore();
        const ring = ringUsing(store);

        const created = await ring.generate();

        expect(created).toMatchObject({
            id: 'creator_00000000000040008000000000000001',
            algorithm: 'Ed25519',
            status: 'active',
            recoveryStatus: 'required',
            createdAt: '2026-06-21T12:00:00.000Z',
            statusChangedAt: '2026-06-21T12:00:00.000Z',
        });
        expect(created.publicKey).toMatch(/^[A-Za-z0-9_-]{43}$/u);
        expect(created).not.toHaveProperty('privateKey');

        const active = await ring.activeSigningKey();
        expect(active.privateKey.type).toBe('private');
        expect(active.privateKey.algorithm.name).toBe('Ed25519');
        expect(active.privateKey.usages).toEqual(['sign']);
        expect(active.privateKey.extractable).toBe(true);
    });

    it('blocks publication until recovery materials are explicitly confirmed saved', async () => {
        const ring = ringUsing(new MemoryCreatorSigningKeyStore());
        const created = await ring.generate();

        await expect(ring.publicationSigningKey()).rejects.toMatchObject({
            code: 'recovery_required',
        });
        expect(await ring.confirmRecoverySaved(created.id)).toMatchObject({
            recoveryStatus: 'confirmed',
            recoveryConfirmedAt: '2026-06-21T12:00:00.000Z',
        });
        expect((await ring.publicationSigningKey()).id).toBe(created.id);
        await expect(ring.confirmRecoverySaved(created.id)).resolves.toMatchObject({
            id: created.id,
            recoveryStatus: 'confirmed',
            recoveryConfirmedAt: '2026-06-21T12:00:00.000Z',
        });
    });

    it('restores recovered signing authority as active and recovery-confirmed', async () => {
        const sourceRing = ringUsing(new MemoryCreatorSigningKeyStore());
        await sourceRing.generate();
        const source = await sourceRing.activeSigningKey();
        const restoredRing = ringUsing(new MemoryCreatorSigningKeyStore());

        const restored = await restoredRing.restore({
            id: source.id,
            algorithm: source.algorithm,
            publicKey: source.publicKey,
            privateKey: source.privateKey,
            createdAt: source.createdAt,
        });

        expect(restored).toMatchObject({
            id: source.id,
            status: 'active',
            recoveryStatus: 'confirmed',
            recoveryConfirmedAt: '2026-06-21T12:00:00.000Z',
        });
        expect((await restoredRing.publicationSigningKey()).privateKey).toBe(source.privateKey);
    });

    it('atomically retires the old active record when generating a replacement', async () => {
        const store = new MemoryCreatorSigningKeyStore();
        const ring = ringUsing(store);

        const first = await ring.generate();
        const second = await ring.generate();

        expect((await ring.activeSigningKey()).id).toBe(second.id);
        expect(await ring.list()).toEqual([
            expect.objectContaining({ id: second.id, status: 'active' }),
            expect.objectContaining({ id: first.id, status: 'retiring' }),
        ]);
        expect((await ring.list()).filter((key) => key.status === 'active')).toHaveLength(1);
    });

    it('supports the closed lifecycle and never reactivates terminal records', async () => {
        const store = new MemoryCreatorSigningKeyStore();
        const ring = ringUsing(store);
        const first = await ring.generate();
        await ring.generate();

        expect(await ring.expire(first.id)).toMatchObject({ status: 'expired' });
        await expect(ring.revoke(first.id)).rejects.toMatchObject({
            code: 'invalid_transition',
        });

        const active = await ring.activeSigningKey();
        expect(await ring.revoke(active.id)).toMatchObject({ status: 'revoked' });
        await expect(ring.activeSigningKey()).rejects.toMatchObject({ code: 'no_active_key' });
        await expect(ring.expire(active.id)).rejects.toMatchObject({
            code: 'invalid_transition',
        });
    });

    it('distinguishes missing records from invalid transitions', async () => {
        const ring = ringUsing(new MemoryCreatorSigningKeyStore());

        await expect(ring.revoke('creator_missing')).rejects.toMatchObject({
            code: 'key_not_found',
        });
    });

    it('fails closed when key generation or durable storage fails', async () => {
        const store = new MemoryCreatorSigningKeyStore();
        store.failWrites = true;
        await expect(ringUsing(store).generate()).rejects.toMatchObject({
            code: 'storage_failed',
        });

        const brokenCrypto = {
            randomUUID: () =>
                '00000000-0000-4000-8000-000000000001' as `${string}-${string}-${string}-${string}-${string}`,
            subtle: {
                generateKey: async () => {
                    throw new Error('unavailable');
                },
            } as unknown as SubtleCrypto,
        };
        await expect(
            new CreatorSigningKeyRing(new MemoryCreatorSigningKeyStore(), brokenCrypto).generate(),
        ).rejects.toEqual(new CreatorSigningKeyError('generation_failed'));
    });
});

function ringUsing(store: CreatorSigningKeyStore): CreatorSigningKeyRing {
    let sequence = 0;
    return new CreatorSigningKeyRing(
        store,
        {
            randomUUID: () =>
                `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}` as `${string}-${string}-${string}-${string}-${string}`,
            subtle: crypto.subtle,
        },
        { now: () => new Date('2026-06-21T12:00:00.000Z') },
    );
}

class MemoryCreatorSigningKeyStore implements CreatorSigningKeyStore {
    private records: CreatorSigningKeyRecord[] = [];
    public failWrites = false;

    public async addAsActive(record: CreatorSigningKeyRecord): Promise<void> {
        if (this.failWrites) throw new Error('storage failed');
        this.records = [
            ...this.records.map((existing) =>
                existing.status === 'active'
                    ? {
                          ...existing,
                          status: 'retiring' as const,
                          statusChangedAt: record.statusChangedAt,
                      }
                    : existing,
            ),
            record,
        ];
    }

    public async list(): Promise<readonly CreatorSigningKeyRecord[]> {
        return this.records;
    }

    public async transition(
        id: string,
        allowedCurrentStatuses: readonly CreatorSigningKeyStatus[],
        status: CreatorSigningKeyStatus,
        changedAt: string,
    ): Promise<CreatorSigningKeyRecord | undefined> {
        const index = this.records.findIndex((record) => record.id === id);
        const current = this.records[index];
        if (current === undefined || !allowedCurrentStatuses.includes(current.status)) {
            return undefined;
        }
        const changed = { ...current, status, statusChangedAt: changedAt };
        this.records[index] = changed;
        return changed;
    }

    public async confirmRecovery(
        id: string,
        confirmedAt: string,
    ): Promise<CreatorSigningKeyRecord | undefined> {
        const index = this.records.findIndex((record) => record.id === id);
        const current = this.records[index];
        if (
            current === undefined ||
            current.status !== 'active' ||
            current.recoveryStatus !== 'required'
        ) {
            return undefined;
        }
        const confirmed = {
            ...current,
            recoveryStatus: 'confirmed' as const,
            recoveryConfirmedAt: confirmedAt,
        };
        this.records[index] = confirmed;
        return confirmed;
    }
}
