import {
    encodeBase64Url,
    encryptPayloadV1,
    payloadEncryptionContextFromManifest,
    type CapsuleManifestV1,
} from '@sharecapsules/capsule-core';
import { validManifestV1 } from '@sharecapsules/test-fixtures';
import { describe, expect, it } from 'vitest';

import {
    StaticImageCreatorProfileV1,
    type StaticImageDecoder,
} from './static-image-creator-profile.js';
import { ViewerPayloadRenderer, type ViewerObjectUrlFactory } from './viewer-payload-renderer.js';
import type { VerifiedViewerCapsuleSummary } from './viewer-capsule-verifier.js';

describe('Viewer payload renderer', () => {
    it('decrypts the signed payload, validates the actual static image bytes, renders a local object URL, and erases key/plaintext buffers', async () => {
        const fixture = await encryptedPngFixture();
        const objectUrls = new RecordingObjectUrls();
        const renderer = new ViewerPayloadRenderer({
            profile: new StaticImageCreatorProfileV1(new TestDecoder(1, 1)),
            objectUrls,
        });

        const result = await renderer.render(
            fixture.summary,
            fixture.encryptedPayload,
            fixture.contentKey,
        );

        expect(result).toEqual({
            ok: true,
            objectUrl: 'blob:viewer-test-1',
            mediaType: 'image/png',
            altText: 'A tiny transparent PNG.',
        });
        expect(fixture.contentKey).toEqual(new Uint8Array(32));
        expect(objectUrls.created).toHaveLength(1);
        expect(objectUrls.created[0]).toMatchObject({
            size: fixture.summary.payloadPlaintextBytes,
            type: 'image/png',
        });

        renderer.dispose(result);
        expect(objectUrls.revoked).toEqual(['blob:viewer-test-1']);
    });

    it('rejects decrypted bytes that do not match the signed static-image metadata', async () => {
        const fixture = await encryptedPngFixture();
        const renderer = new ViewerPayloadRenderer({
            profile: new StaticImageCreatorProfileV1(new TestDecoder(2, 1)),
            objectUrls: new RecordingObjectUrls(),
        });

        await expect(
            renderer.render(fixture.summary, fixture.encryptedPayload, fixture.contentKey),
        ).resolves.toEqual({ ok: false, code: 'invalid_plaintext' });
        expect(fixture.contentKey).toEqual(new Uint8Array(32));
    });

    it('rejects actual image metadata that differs from the signed manifest summary', async () => {
        const fixture = await encryptedPngFixture({
            summaryChanges: { profileMetadata: { width: 2, height: 1, pixelCount: 2 } },
        });
        const objectUrls = new RecordingObjectUrls();

        await expect(
            new ViewerPayloadRenderer({
                profile: new StaticImageCreatorProfileV1(new TestDecoder(1, 1)),
                objectUrls,
            }).render(fixture.summary, fixture.encryptedPayload, fixture.contentKey),
        ).resolves.toEqual({ ok: false, code: 'profile_mismatch' });
        expect(fixture.contentKey).toEqual(new Uint8Array(32));
        expect(objectUrls.created).toEqual([]);
    });

    it.each([
        ['malformed image bytes', () => Uint8Array.from([0x89, 0x50, 0x4e, 0x47])],
        ['corrupt PNG checksum', () => corruptPng()],
        ['animated PNG', () => animatedPng()],
        ['dimension limit overflow', () => png(16_385, 1)],
        ['decoded-memory limit overflow', () => png(10_000, 4_001)],
    ] as const)('fails closed before object URL creation for %s', async (_, plaintextFactory) => {
        const plaintext = plaintextFactory();
        const fixture = await encryptedPngFixture({
            plaintext,
            width: 1,
            height: 1,
        });
        const objectUrls = new RecordingObjectUrls();

        await expect(
            new ViewerPayloadRenderer({
                profile: new StaticImageCreatorProfileV1(new TestDecoder(1, 1)),
                objectUrls,
            }).render(fixture.summary, fixture.encryptedPayload, fixture.contentKey),
        ).resolves.toEqual({ ok: false, code: 'invalid_plaintext' });
        expect(fixture.contentKey).toEqual(new Uint8Array(32));
        expect(objectUrls.created).toEqual([]);
    });

    it('fails closed without object URL creation when browser decoding fails', async () => {
        const fixture = await encryptedPngFixture();
        const objectUrls = new RecordingObjectUrls();
        const decoder: StaticImageDecoder = {
            decode: async () => Promise.reject(new Error('decode failed')),
        };

        await expect(
            new ViewerPayloadRenderer({
                profile: new StaticImageCreatorProfileV1(decoder),
                objectUrls,
            }).render(fixture.summary, fixture.encryptedPayload, fixture.contentKey),
        ).resolves.toEqual({ ok: false, code: 'invalid_plaintext' });
        expect(fixture.contentKey).toEqual(new Uint8Array(32));
        expect(objectUrls.created).toEqual([]);
    });

    it('bounds stuck image decoding with a fail-closed render timeout', async () => {
        const fixture = await encryptedPngFixture();
        const objectUrls = new RecordingObjectUrls();
        const decoder: StaticImageDecoder = {
            decode: async () => new Promise(() => undefined),
        };

        await expect(
            new ViewerPayloadRenderer({
                profile: new StaticImageCreatorProfileV1(decoder),
                objectUrls,
                renderTimeoutMs: 1,
            }).render(fixture.summary, fixture.encryptedPayload, fixture.contentKey),
        ).resolves.toEqual({ ok: false, code: 'render_timeout' });
        expect(fixture.contentKey).toEqual(new Uint8Array(32));
        expect(objectUrls.created).toEqual([]);
    });

    it('rejects payloads that cannot be authenticated with the released key', async () => {
        const fixture = await encryptedPngFixture();
        const changed = fixture.encryptedPayload.slice();
        changed[0] = changed[0]! ^ 1;

        await expect(
            new ViewerPayloadRenderer({
                profile: new StaticImageCreatorProfileV1(new TestDecoder(1, 1)),
                objectUrls: new RecordingObjectUrls(),
            }).render(fixture.summary, changed, fixture.contentKey),
        ).resolves.toEqual({ ok: false, code: 'decryption_failed' });
        expect(fixture.contentKey).toEqual(new Uint8Array(32));
    });

    it('reports render failure if object URL creation fails after validation', async () => {
        const fixture = await encryptedPngFixture();
        const objectUrls = new ThrowingObjectUrls();

        await expect(
            new ViewerPayloadRenderer({
                profile: new StaticImageCreatorProfileV1(new TestDecoder(1, 1)),
                objectUrls,
            }).render(fixture.summary, fixture.encryptedPayload, fixture.contentKey),
        ).resolves.toEqual({ ok: false, code: 'render_failed' });
        expect(fixture.contentKey).toEqual(new Uint8Array(32));
        expect(objectUrls.created).toBe(1);
    });
});

async function encryptedPngFixture(
    options: {
        readonly plaintext?: Uint8Array;
        readonly width?: number;
        readonly height?: number;
        readonly summaryChanges?: Partial<VerifiedViewerCapsuleSummary>;
    } = {},
): Promise<{
    readonly summary: VerifiedViewerCapsuleSummary;
    readonly encryptedPayload: Uint8Array;
    readonly contentKey: Uint8Array;
}> {
    const plaintext = options.plaintext ?? png(1, 1);
    const width = options.width ?? 1;
    const height = options.height ?? 1;
    const contentKey = new Uint8Array(32).fill(7);
    const nonce = new Uint8Array(12).fill(8);
    const manifest: CapsuleManifestV1 = structuredClone(validManifestV1);
    manifest.description = {
        title: 'Tiny PNG',
        description: 'A tiny transparent PNG.',
    };
    manifest.payloads[0].media_type = 'image/png';
    manifest.payloads[0].plaintext_size = plaintext.byteLength;
    manifest.payloads[0].ciphertext_size = plaintext.byteLength + 16;
    manifest.payloads[0].encryption.nonce = encodeBase64Url(nonce);
    manifest.payloads[0].profile_metadata = {
        width,
        height,
        pixel_count: width * height,
    };
    const context = payloadEncryptionContextFromManifest(manifest);
    const encrypted = await encryptPayloadV1(plaintext, contentKey, nonce, context);

    const summary: VerifiedViewerCapsuleSummary = {
        capsuleId: manifest.capsule.id,
        capsuleRevision: manifest.capsule.revision,
        title: manifest.description.title,
        description: manifest.description.description,
        contentProfileId: manifest.content_profile.id,
        contentProfileVersion: manifest.content_profile.version,
        mediaType: manifest.payloads[0].media_type,
        payloadId: manifest.payloads[0].id,
        payloadPath: manifest.payloads[0].path,
        payloadPlaintextBytes: manifest.payloads[0].plaintext_size,
        payloadNonce: nonce.slice(),
        payloadEncryptionContext: context,
        profileMetadata: {
            width,
            height,
            pixelCount: width * height,
        },
        ctxIssuer: manifest.ctx.issuer,
        policy: manifest.policy,
        policySha256: 'policy-digest',
        broker: manifest.payloads[0].key_release.broker,
        releaseHandle: manifest.payloads[0].key_release.handle,
        ciphertextBytes: encrypted.ciphertext.byteLength,
    };

    return {
        summary: { ...summary, ...options.summaryChanges },
        encryptedPayload: encrypted.ciphertext,
        contentKey: contentKey.slice(),
    };
}

function png(
    width: number,
    height: number,
    extras: readonly (readonly [string, Uint8Array])[] = [],
): Uint8Array {
    const header = new Uint8Array(13);
    writeU32Be(header, 0, width);
    writeU32Be(header, 4, height);
    header.set([8, 6, 0, 0, 0], 8);
    return join(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        pngChunk('IHDR', header),
        ...extras.map(([type, data]) => pngChunk(type, data)),
        pngChunk('IDAT', Uint8Array.from([0x78, 0x01, 0x00])),
        pngChunk('IEND', new Uint8Array()),
    );
}

function animatedPng(): Uint8Array {
    return png(1, 1, [['acTL', u32Pair(1, 0)]]);
}

function corruptPng(): Uint8Array {
    const bytes = png(1, 1);
    bytes[bytes.byteLength - 5] = bytes[bytes.byteLength - 5]! ^ 1;
    return bytes;
}

class TestDecoder implements StaticImageDecoder {
    public constructor(
        private readonly width: number,
        private readonly height: number,
    ) {}

    public async decode(): Promise<{ readonly width: number; readonly height: number }> {
        return { width: this.width, height: this.height };
    }
}

class RecordingObjectUrls implements ViewerObjectUrlFactory {
    public readonly created: Blob[] = [];
    public readonly revoked: string[] = [];

    public create(blob: Blob): string {
        this.created.push(blob);
        return `blob:viewer-test-${this.created.length}`;
    }

    public revoke(url: string): void {
        this.revoked.push(url);
    }
}

class ThrowingObjectUrls implements ViewerObjectUrlFactory {
    public created = 0;

    public create(): string {
        this.created++;
        throw new Error('object URL unavailable');
    }

    public revoke(): void {}
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
    const typeBytes = new TextEncoder().encode(type);
    const result = new Uint8Array(12 + data.byteLength);
    writeU32Be(result, 0, data.byteLength);
    result.set(typeBytes, 4);
    result.set(data, 8);
    writeU32Be(result, 8 + data.byteLength, crc32(result.subarray(4, 8 + data.byteLength)));
    return result;
}

function u32Pair(left: number, right: number): Uint8Array {
    const value = new Uint8Array(8);
    writeU32Be(value, 0, left);
    writeU32Be(value, 4, right);
    return value;
}

function join(...values: readonly Uint8Array[]): Uint8Array {
    const result = new Uint8Array(values.reduce((sum, value) => sum + value.byteLength, 0));
    let offset = 0;
    for (const value of values) {
        result.set(value, offset);
        offset += value.byteLength;
    }
    return result;
}

function crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function writeU32Be(bytes: Uint8Array, offset: number, value: number): void {
    bytes[offset] = (value >>> 24) & 0xff;
    bytes[offset + 1] = (value >>> 16) & 0xff;
    bytes[offset + 2] = (value >>> 8) & 0xff;
    bytes[offset + 3] = value & 0xff;
}
