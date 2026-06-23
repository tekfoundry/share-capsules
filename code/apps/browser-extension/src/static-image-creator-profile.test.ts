import {
    STATIC_IMAGE_MAX_ENCODED_BYTES,
    STATIC_IMAGE_MAX_WIDTH,
} from '@sharecapsules/capsule-core';
import { describe, expect, it } from 'vitest';

import { CREATOR_CONTENT_PROFILE_REGISTRY } from './creator-content-profiles.js';
import type { ContentByteSource } from './creator-content-profile.js';
import {
    StaticImageCreatorProfileV1,
    type StaticImageDecoder,
} from './static-image-creator-profile.js';

describe('static-image creator content profile', () => {
    it.each([
        ['PNG', png(16, 9), 'image/png'],
        ['JPEG', jpeg(16, 9), 'image/jpeg'],
        ['lossless WebP', webpLossless(16, 9), 'image/webp'],
        ['lossy WebP', webpLossy(16, 9), 'image/webp'],
        ['extended WebP', extendedWebp(16, 9), 'image/webp'],
    ] as const)(
        'inspects actual %s bytes and returns normalized signed metadata',
        async (_, bytes, mediaType) => {
            const decoder = new TestDecoder(16, 9);
            const result = await new StaticImageCreatorProfileV1(decoder).inspect(source(bytes));

            expect(result).toEqual({
                valid: true,
                metadata: {
                    mediaType,
                    encodedBytes: bytes.byteLength,
                    width: 16,
                    height: 9,
                    pixelCount: 144,
                    nominalDecodedRgbaBytes: 576,
                },
            });
            expect(decoder.calls).toEqual([{ mediaType, bytes }]);
            expect(Object.isFrozen(result)).toBe(true);
            if (result.valid) expect(Object.isFrozen(result.metadata)).toBe(true);
        },
    );

    it.each([
        ['GIF', Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])],
        ['SVG', new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
        ['unknown data', Uint8Array.from([1, 2, 3, 4])],
    ])('rejects unsupported or active %s content from its bytes', async (_, bytes) => {
        expect(await issueCode(bytes)).toBe('unsupported_content');
    });

    it.each([
        ['APNG', png(2, 2, [['acTL', u32Pair(1, 0)]]), 'animated_content'],
        ['animated WebP', animatedWebp(2, 2), 'animated_content'],
        ['multi-picture JPEG', jpeg(2, 2, true), 'animated_content'],
    ] as const)('rejects %s', async (_, bytes, code) => {
        expect(await issueCode(bytes)).toBe(code);
    });

    it('rejects malformed, truncated, trailing, and checksum-invalid structures', async () => {
        const badCrc = png(2, 2);
        const crcByte = badCrc.byteLength - 5;
        badCrc[crcByte] = (badCrc[crcByte] ?? 0) ^ 1;

        await expect(issueCode(badCrc)).resolves.toBe('malformed_content');
        await expect(issueCode(jpeg(2, 2).subarray(0, 10))).resolves.toBe('malformed_content');
        await expect(issueCode(Uint8Array.from([...webpLossless(2, 2), 0]))).resolves.toBe(
            'malformed_content',
        );
    });

    it('enforces encoded size before reading source bytes', async () => {
        let reads = 0;
        const result = await new StaticImageCreatorProfileV1(new TestDecoder(1, 1)).inspect({
            size: STATIC_IMAGE_MAX_ENCODED_BYTES + 1,
            read: async () => {
                reads++;
                return new Uint8Array();
            },
        });

        expect(result).toMatchObject({
            valid: false,
            issues: [{ code: 'encoded_size_exceeded' }],
        });
        expect(reads).toBe(0);
    });

    it('enforces dimension and decoded-pixel limits before browser decoding', async () => {
        const decoder = new TestDecoder(1, 1);

        expect(await inspectionIssue(png(STATIC_IMAGE_MAX_WIDTH + 1, 1), decoder)).toBe(
            'dimension_exceeded',
        );
        expect(await inspectionIssue(png(10_000, 4_001), decoder)).toBe('pixel_count_exceeded');
        const oversizedPixels = await new StaticImageCreatorProfileV1(decoder).inspect(
            source(png(10_000, 4_001)),
        );
        expect(oversizedPixels).toMatchObject({
            valid: false,
            issues: [{ code: 'pixel_count_exceeded' }, { code: 'decoded_size_exceeded' }],
        });
        expect(decoder.calls).toHaveLength(0);
    });

    it('accepts structurally valid indexed PNG palette data', async () => {
        const indexed = png(2, 2, [['PLTE', Uint8Array.from([0, 0, 0])]], 3);

        expect(
            await new StaticImageCreatorProfileV1(new TestDecoder(2, 2)).inspect(source(indexed)),
        ).toMatchObject({ valid: true, metadata: { mediaType: 'image/png' } });
    });

    it('accepts the independent width and pixel boundaries exactly', async () => {
        const widthBoundary = png(STATIC_IMAGE_MAX_WIDTH, 1);
        const pixelBoundary = png(10_000, 4_000);

        expect(
            await new StaticImageCreatorProfileV1(
                new TestDecoder(STATIC_IMAGE_MAX_WIDTH, 1),
            ).inspect(source(widthBoundary)),
        ).toMatchObject({ valid: true, metadata: { width: STATIC_IMAGE_MAX_WIDTH } });
        expect(
            await new StaticImageCreatorProfileV1(new TestDecoder(10_000, 4_000)).inspect(
                source(pixelBoundary),
            ),
        ).toMatchObject({ valid: true, metadata: { pixelCount: 40_000_000 } });
    });

    it('fails closed on source changes, read errors, decode errors, and decoder mismatch', async () => {
        const bytes = png(2, 2);
        await expect(
            issueCodeFromSource({ size: bytes.byteLength + 1, read: async () => bytes }),
        ).resolves.toBe('size_mismatch');
        await expect(
            issueCodeFromSource({
                size: bytes.byteLength,
                read: async () => Promise.reject(new Error('unavailable')),
            }),
        ).resolves.toBe('read_failed');

        const failingDecoder: StaticImageDecoder = {
            decode: async () => Promise.reject(new Error('decode failed')),
        };
        expect(await inspectionIssue(bytes, failingDecoder)).toBe('decode_failed');
        expect(await inspectionIssue(bytes, new TestDecoder(3, 2))).toBe('malformed_content');
    });

    it('resolves the creator implementation through the trusted profile registry', () => {
        const profile = CREATOR_CONTENT_PROFILE_REGISTRY.resolve('ctx.content.static-image', '1.0');

        expect(profile).toMatchObject({
            id: 'ctx.content.static-image',
            version: '1.0',
            mediaTypes: ['image/jpeg', 'image/png', 'image/webp'],
        });
    });
});

class TestDecoder implements StaticImageDecoder {
    public readonly calls: Array<{ mediaType: string; bytes: Uint8Array }> = [];

    public constructor(
        private readonly width: number,
        private readonly height: number,
    ) {}

    public async decode(bytes: Uint8Array, mediaType: string) {
        this.calls.push({ mediaType, bytes });
        return { width: this.width, height: this.height };
    }
}

function source(bytes: Uint8Array): ContentByteSource {
    return { size: bytes.byteLength, read: async () => bytes };
}

async function issueCode(bytes: Uint8Array): Promise<string> {
    return inspectionIssue(bytes, new TestDecoder(1, 1));
}

async function issueCodeFromSource(value: ContentByteSource): Promise<string> {
    const result = await new StaticImageCreatorProfileV1(new TestDecoder(1, 1)).inspect(value);
    if (result.valid) throw new Error('Expected inspection to fail.');
    return result.issues[0]?.code ?? 'missing_issue';
}

async function inspectionIssue(bytes: Uint8Array, decoder: StaticImageDecoder): Promise<string> {
    const result = await new StaticImageCreatorProfileV1(decoder).inspect(source(bytes));
    if (result.valid) throw new Error('Expected inspection to fail.');
    return result.issues[0]?.code ?? 'missing_issue';
}

function png(
    width: number,
    height: number,
    extras: readonly (readonly [string, Uint8Array])[] = [],
    colorType = 6,
): Uint8Array {
    const header = new Uint8Array(13);
    writeU32Be(header, 0, width);
    writeU32Be(header, 4, height);
    header.set([8, colorType, 0, 0, 0], 8);
    return join(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        pngChunk('IHDR', header),
        ...extras.map(([type, data]) => pngChunk(type, data)),
        pngChunk('IDAT', Uint8Array.from([0x78, 0x01, 0x00])),
        pngChunk('IEND', new Uint8Array()),
    );
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

function jpeg(width: number, height: number, multiPicture = false): Uint8Array {
    const frame = Uint8Array.from([
        0xff,
        0xc0,
        0x00,
        0x0b,
        0x08,
        height >>> 8,
        height & 0xff,
        width >>> 8,
        width & 0xff,
        0x01,
        0x01,
        0x11,
        0x00,
    ]);
    const scan = Uint8Array.from([
        0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x00,
    ]);
    const mpf = multiPicture
        ? Uint8Array.from([0xff, 0xe2, 0x00, 0x06, 0x4d, 0x50, 0x46, 0x00])
        : new Uint8Array();
    return join(Uint8Array.from([0xff, 0xd8]), mpf, frame, scan, Uint8Array.from([0xff, 0xd9]));
}

function webpLossless(width: number, height: number): Uint8Array {
    const bits = (width - 1) | ((height - 1) << 14);
    const data = new Uint8Array(5);
    data[0] = 0x2f;
    writeU32Le(data, 1, bits);
    return webpChunks([['VP8L', data]]);
}

function webpLossy(width: number, height: number): Uint8Array {
    const data = new Uint8Array(10);
    data.set([0, 0, 0, 0x9d, 0x01, 0x2a], 0);
    data[6] = width & 0xff;
    data[7] = (width >>> 8) & 0x3f;
    data[8] = height & 0xff;
    data[9] = (height >>> 8) & 0x3f;
    return webpChunks([['VP8 ', data]]);
}

function extendedWebp(width: number, height: number): Uint8Array {
    const extended = new Uint8Array(10);
    writeU24Le(extended, 4, width - 1);
    writeU24Le(extended, 7, height - 1);
    const image = webpLossless(width, height).subarray(20, 25);
    return webpChunks([
        ['VP8X', extended],
        ['VP8L', image],
    ]);
}

function animatedWebp(width: number, height: number): Uint8Array {
    const extended = new Uint8Array(10);
    extended[0] = 0x02;
    writeU24Le(extended, 4, width - 1);
    writeU24Le(extended, 7, height - 1);
    const image = webpLossless(width, height).subarray(20, 25);
    return webpChunks([
        ['VP8X', extended],
        ['VP8L', image],
    ]);
}

function webpChunks(chunks: readonly (readonly [string, Uint8Array])[]): Uint8Array {
    const body = join(
        new TextEncoder().encode('WEBP'),
        ...chunks.map(([type, data]) => {
            const chunk = new Uint8Array(8 + data.byteLength + (data.byteLength % 2));
            chunk.set(new TextEncoder().encode(type), 0);
            writeU32Le(chunk, 4, data.byteLength);
            chunk.set(data, 8);
            return chunk;
        }),
    );
    const result = new Uint8Array(8 + body.byteLength);
    result.set(new TextEncoder().encode('RIFF'), 0);
    writeU32Le(result, 4, body.byteLength);
    result.set(body, 8);
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

function writeU24Le(bytes: Uint8Array, offset: number, value: number): void {
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >>> 8) & 0xff;
    bytes[offset + 2] = (value >>> 16) & 0xff;
}

function writeU32Be(bytes: Uint8Array, offset: number, value: number): void {
    bytes[offset] = (value >>> 24) & 0xff;
    bytes[offset + 1] = (value >>> 16) & 0xff;
    bytes[offset + 2] = (value >>> 8) & 0xff;
    bytes[offset + 3] = value & 0xff;
}

function writeU32Le(bytes: Uint8Array, offset: number, value: number): void {
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >>> 8) & 0xff;
    bytes[offset + 2] = (value >>> 16) & 0xff;
    bytes[offset + 3] = (value >>> 24) & 0xff;
}
