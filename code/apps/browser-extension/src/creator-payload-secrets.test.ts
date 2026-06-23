import { describe, expect, it } from 'vitest';

import {
    CreatorPayloadSecretsError,
    CreatorPayloadSecretsFactory,
} from './creator-payload-secrets.js';

describe('creator payload secrets', () => {
    it('generates an independent 256-bit key and 96-bit nonce for every payload', async () => {
        const requests: number[] = [];
        let sequence = 0;
        const factory = new CreatorPayloadSecretsFactory((target) => {
            requests.push(target.byteLength);
            target.fill(++sequence);
        });

        const first = factory.create();
        const second = factory.create();

        expect(requests).toEqual([32, 12, 32, 12]);
        expect(first.nonceBytes()).toEqual(new Uint8Array(12).fill(2));
        expect(second.nonceBytes()).toEqual(new Uint8Array(12).fill(4));
        await first.withContentKey(async (key) => expect(key).toEqual(new Uint8Array(32).fill(1)));
        await second.withContentKey(async (key) => expect(key).toEqual(new Uint8Array(32).fill(3)));
    });

    it('provides defensive nonce copies and erases temporary key copies after use', async () => {
        const secrets = new CreatorPayloadSecretsFactory((target) => target.fill(7)).create();
        const nonce = secrets.nonceBytes();
        nonce.fill(99);
        expect(secrets.nonceBytes()).toEqual(new Uint8Array(12).fill(7));

        let observed: Uint8Array | undefined;
        await secrets.withContentKey(async (key) => {
            observed = key;
            key[0] = 42;
        });
        expect(observed).toEqual(new Uint8Array(32));
        await secrets.withContentKey(async (key) => {
            expect(key).toEqual(new Uint8Array(32).fill(7));
        });
    });

    it('allows sequential broker and encryption access but rejects concurrent key access', async () => {
        const secrets = new CreatorPayloadSecretsFactory((target) => target.fill(3)).create();
        let release: (() => void) | undefined;
        const pending = secrets.withContentKey(
            async () =>
                new Promise<void>((resolve) => {
                    release = resolve;
                }),
        );

        await expect(secrets.withContentKey(async () => undefined)).rejects.toEqual(
            new CreatorPayloadSecretsError('content_key_in_use'),
        );
        release?.();
        await pending;
        await expect(secrets.withContentKey(async () => 'encrypted')).resolves.toBe('encrypted');
    });

    it('destroys key and nonce material idempotently and rejects later use', async () => {
        const secrets = new CreatorPayloadSecretsFactory((target) => target.fill(5)).create();

        secrets.destroy();
        secrets.destroy();

        expect(secrets.isDestroyed()).toBe(true);
        expect(() => secrets.nonceBytes()).toThrow(new CreatorPayloadSecretsError('destroyed'));
        await expect(secrets.withContentKey(async () => undefined)).rejects.toEqual(
            new CreatorPayloadSecretsError('destroyed'),
        );
    });

    it('fails closed and erases partial material when secure randomness fails', () => {
        let invocation = 0;
        const temporaryBuffers: Uint8Array[] = [];
        const factory = new CreatorPayloadSecretsFactory((target) => {
            temporaryBuffers.push(target);
            target.fill(9);
            if (++invocation === 2) throw new Error('random source failed');
        });

        expect(() => factory.create()).toThrow(new CreatorPayloadSecretsError('randomness_failed'));
        expect(temporaryBuffers).toHaveLength(2);
        expect(temporaryBuffers.every((buffer) => buffer.every((byte) => byte === 0))).toBe(true);
    });
});
