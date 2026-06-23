import {
    generatePayloadContentKey,
    generatePayloadNonce,
    type RandomByteFiller,
} from '@sharecapsules/capsule-core';

export class CreatorPayloadSecretsError extends Error {
    public constructor(
        public readonly code:
            | 'content_key_in_use'
            | 'destroyed'
            | 'invalid_material'
            | 'randomness_failed',
    ) {
        super(code);
        this.name = 'CreatorPayloadSecretsError';
    }
}

export class CreatorPayloadSecrets {
    private destroyed = false;
    private contentKeyInUse = false;
    private readonly contentKey: Uint8Array;
    private readonly nonce: Uint8Array;

    public constructor(contentKey: Uint8Array, nonce: Uint8Array) {
        if (contentKey.byteLength !== 32 || nonce.byteLength !== 12) {
            throw new CreatorPayloadSecretsError('invalid_material');
        }
        this.contentKey = contentKey.slice();
        this.nonce = nonce.slice();
    }

    public nonceBytes(): Uint8Array {
        this.assertAvailable();
        return this.nonce.slice();
    }

    public async withContentKey<T>(operation: (contentKey: Uint8Array) => Promise<T>): Promise<T> {
        this.assertAvailable();
        if (this.contentKeyInUse) {
            throw new CreatorPayloadSecretsError('content_key_in_use');
        }
        this.contentKeyInUse = true;
        const workingCopy = this.contentKey.slice();
        try {
            return await operation(workingCopy);
        } finally {
            workingCopy.fill(0);
            this.contentKeyInUse = false;
        }
    }

    public destroy(): void {
        if (this.destroyed) return;
        this.contentKey.fill(0);
        this.nonce.fill(0);
        this.destroyed = true;
    }

    public isDestroyed(): boolean {
        return this.destroyed;
    }

    private assertAvailable(): void {
        if (this.destroyed) throw new CreatorPayloadSecretsError('destroyed');
    }
}

export class CreatorPayloadSecretsFactory {
    public constructor(private readonly fillRandom?: RandomByteFiller) {}

    public create(): CreatorPayloadSecrets {
        let contentKey: Uint8Array | undefined;
        let nonce: Uint8Array | undefined;
        try {
            contentKey = generatePayloadContentKey(this.fillRandom);
            nonce = generatePayloadNonce(this.fillRandom);
            return new CreatorPayloadSecrets(contentKey, nonce);
        } catch {
            throw new CreatorPayloadSecretsError('randomness_failed');
        } finally {
            contentKey?.fill(0);
            nonce?.fill(0);
        }
    }
}
