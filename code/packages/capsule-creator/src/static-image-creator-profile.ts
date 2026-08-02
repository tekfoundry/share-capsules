import {
    STATIC_IMAGE_MAX_DECODED_RGBA_BYTES,
    STATIC_IMAGE_MAX_ENCODED_BYTES,
    STATIC_IMAGE_MAX_HEIGHT,
    STATIC_IMAGE_MAX_PIXEL_COUNT,
    STATIC_IMAGE_MAX_WIDTH,
    STATIC_IMAGE_MEDIA_TYPES,
    STATIC_IMAGE_PROFILE_ID,
    STATIC_IMAGE_PROFILE_VERSION,
    STATIC_IMAGE_RGBA_BYTES_PER_PIXEL,
    type StaticImageMediaTypeV1,
    type StaticImageMetadataV1,
} from '@sharecapsules/capsule-core';

import {
    type ContentByteSource,
    type ContentInspection,
    type ContentInspectionIssue,
    type CreatorContentProfile,
} from './creator-content-profile.js';

export interface StaticImageDecoder {
    decode(
        bytes: Uint8Array,
        mediaType: StaticImageMediaTypeV1,
    ): Promise<{ readonly width: number; readonly height: number }>;
}

export class StaticImageCreatorProfileV1 implements CreatorContentProfile<StaticImageMetadataV1> {
    public readonly id = STATIC_IMAGE_PROFILE_ID;
    public readonly version = STATIC_IMAGE_PROFILE_VERSION;
    public readonly mediaTypes = STATIC_IMAGE_MEDIA_TYPES;

    public constructor(private readonly decoder: StaticImageDecoder = new BrowserImageDecoder()) {}

    public async inspect(
        source: ContentByteSource,
    ): Promise<ContentInspection<StaticImageMetadataV1>> {
        if (!Number.isSafeInteger(source.size) || source.size < 1) {
            return invalid('empty_content', 'Choose a file that contains image data.');
        }
        if (source.size > STATIC_IMAGE_MAX_ENCODED_BYTES) {
            return invalid('encoded_size_exceeded', 'The file is larger than about 26 MB.');
        }

        let bytes: Uint8Array;
        try {
            bytes = await source.read();
        } catch {
            return invalid('read_failed', 'The selected file could not be read.');
        }
        if (bytes.byteLength !== source.size) {
            return invalid('size_mismatch', 'The selected file changed while it was being read.');
        }
        if (bytes.byteLength > STATIC_IMAGE_MAX_ENCODED_BYTES) {
            return invalid('encoded_size_exceeded', 'The file is larger than about 26 MB.');
        }

        let parsed: ParsedStaticImage;
        try {
            parsed = parseStaticImage(bytes);
        } catch (error) {
            if (error instanceof ImageInspectionFailure) {
                return invalid(error.code, error.message);
            }
            return invalid('malformed_content', 'The file is not a valid supported image.');
        }

        const limitIssues = imageLimitIssues(parsed.width, parsed.height);
        if (limitIssues.length > 0) {
            return Object.freeze({ valid: false, issues: Object.freeze(limitIssues) });
        }

        let decoded: { readonly width: number; readonly height: number };
        try {
            decoded = await this.decoder.decode(bytes, parsed.mediaType);
        } catch {
            return invalid('decode_failed', 'The image could not be decoded safely.');
        }
        if (decoded.width !== parsed.width || decoded.height !== parsed.height) {
            return invalid(
                'malformed_content',
                'The decoded image dimensions do not match its file structure.',
            );
        }

        const pixelCount = parsed.width * parsed.height;
        return Object.freeze({
            valid: true,
            metadata: Object.freeze({
                mediaType: parsed.mediaType,
                encodedBytes: bytes.byteLength,
                width: parsed.width,
                height: parsed.height,
                pixelCount,
                nominalDecodedRgbaBytes: pixelCount * STATIC_IMAGE_RGBA_BYTES_PER_PIXEL,
            }),
        });
    }
}

class BrowserImageDecoder implements StaticImageDecoder {
    public async decode(
        bytes: Uint8Array,
        mediaType: StaticImageMediaTypeV1,
    ): Promise<{ readonly width: number; readonly height: number }> {
        const bitmap = await createImageBitmap(
            new Blob([toArrayBuffer(bytes)], { type: mediaType }),
            { imageOrientation: 'none' },
        );
        try {
            return { width: bitmap.width, height: bitmap.height };
        } finally {
            bitmap.close();
        }
    }
}

interface ParsedStaticImage {
    readonly mediaType: StaticImageMediaTypeV1;
    readonly width: number;
    readonly height: number;
}

class ImageInspectionFailure extends Error {
    public constructor(
        public readonly code: ContentInspectionIssue['code'],
        message: string,
    ) {
        super(message);
        this.name = 'ImageInspectionFailure';
    }
}

function parseStaticImage(bytes: Uint8Array): ParsedStaticImage {
    if (hasBytes(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
        return parsePng(bytes);
    }
    if (hasBytes(bytes, 0, [0xff, 0xd8])) return parseJpeg(bytes);
    if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
        return parseWebP(bytes);
    }

    throw new ImageInspectionFailure(
        'unsupported_content',
        'Choose a static JPEG, PNG, or WebP image.',
    );
}

function parsePng(bytes: Uint8Array): ParsedStaticImage {
    let cursor = 8;
    let width = 0;
    let height = 0;
    let sawHeader = false;
    let bitDepth = 0;
    let colorType = 0;
    let sawPalette = false;
    let sawImageData = false;
    let imageDataEnded = false;
    let sawEnd = false;

    while (cursor < bytes.byteLength) {
        if (cursor + 12 > bytes.byteLength) malformed();
        const length = readU32Be(bytes, cursor);
        const type = ascii(bytes, cursor + 4, 4);
        const dataStart = cursor + 8;
        const dataEnd = dataStart + length;
        const chunkEnd = dataEnd + 4;
        if (!/^[A-Za-z]{4}$/u.test(type) || dataEnd < dataStart || chunkEnd > bytes.byteLength) {
            malformed();
        }
        const expectedCrc = readU32Be(bytes, dataEnd);
        if (crc32(bytes.subarray(cursor + 4, dataEnd)) !== expectedCrc) malformed();

        if (!sawHeader && type !== 'IHDR') malformed();
        if (type === 'IHDR') {
            if (sawHeader || length !== 13) malformed();
            width = readU32Be(bytes, dataStart);
            height = readU32Be(bytes, dataStart + 4);
            bitDepth = bytes[dataStart + 8] ?? -1;
            colorType = bytes[dataStart + 9] ?? -1;
            if (
                width < 1 ||
                height < 1 ||
                !validPngColor(bitDepth, colorType) ||
                bytes[dataStart + 10] !== 0 ||
                bytes[dataStart + 11] !== 0 ||
                (bytes[dataStart + 12] !== 0 && bytes[dataStart + 12] !== 1)
            ) {
                malformed();
            }
            sawHeader = true;
        } else if (type === 'PLTE') {
            if (
                sawPalette ||
                sawImageData ||
                colorType === 0 ||
                colorType === 4 ||
                length < 3 ||
                length > 768 ||
                length % 3 !== 0 ||
                (colorType === 3 && length / 3 > 2 ** bitDepth)
            ) {
                malformed();
            }
            sawPalette = true;
        } else if (type === 'acTL' || type === 'fcTL' || type === 'fdAT') {
            throw new ImageInspectionFailure(
                'animated_content',
                'Animated PNG files are not supported.',
            );
        } else if (type === 'IDAT') {
            if (imageDataEnded || (colorType === 3 && !sawPalette)) malformed();
            sawImageData = true;
        } else if (type === 'IEND') {
            if (length !== 0 || !sawImageData || chunkEnd !== bytes.byteLength) malformed();
            sawEnd = true;
        } else {
            if (sawImageData) imageDataEnded = true;
            if (type[0] === type[0]?.toUpperCase()) malformed();
        }

        cursor = chunkEnd;
        if (sawEnd) break;
    }
    if (!sawHeader || !sawImageData || !sawEnd || cursor !== bytes.byteLength) malformed();

    return { mediaType: 'image/png', width, height };
}

function parseJpeg(bytes: Uint8Array): ParsedStaticImage {
    let cursor = 2;
    let width = 0;
    let height = 0;
    let sawFrame = false;
    let sawScan = false;
    let inEntropy = false;

    while (cursor < bytes.byteLength) {
        if (inEntropy) {
            const marker = findJpegEntropyMarker(bytes, cursor);
            if (marker === undefined) malformed();
            cursor = marker;
            inEntropy = false;
        }
        if (bytes[cursor] !== 0xff) malformed();
        while (bytes[cursor] === 0xff) cursor++;
        const marker = bytes[cursor++];
        if (marker === undefined || marker === 0x00 || marker === 0xd8) malformed();
        if (marker === 0xd9) {
            if (!sawFrame || !sawScan || cursor !== bytes.byteLength) malformed();
            return { mediaType: 'image/jpeg', width, height };
        }
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
        if (cursor + 2 > bytes.byteLength) malformed();
        const segmentLength = readU16Be(bytes, cursor);
        if (segmentLength < 2 || cursor + segmentLength > bytes.byteLength) malformed();
        const dataStart = cursor + 2;
        const dataLength = segmentLength - 2;

        if (isJpegFrameMarker(marker)) {
            if (marker !== 0xc0 && marker !== 0xc1 && marker !== 0xc2) {
                throw new ImageInspectionFailure(
                    'unsupported_content',
                    'This JPEG encoding is not supported.',
                );
            }
            if (sawFrame || dataLength < 9 || bytes[dataStart] !== 8) malformed();
            height = readU16Be(bytes, dataStart + 1);
            width = readU16Be(bytes, dataStart + 3);
            const components = bytes[dataStart + 5];
            if (
                width < 1 ||
                height < 1 ||
                components === undefined ||
                ![1, 3, 4].includes(components) ||
                dataLength !== 6 + 3 * components
            ) {
                malformed();
            }
            sawFrame = true;
        } else if (marker === 0xda) {
            if (!sawFrame || dataLength < 6) malformed();
            const components = bytes[dataStart];
            if (components === undefined || dataLength !== 4 + 2 * components) malformed();
            sawScan = true;
            inEntropy = true;
        } else if (
            marker === 0xe2 &&
            dataLength >= 4 &&
            ascii(bytes, dataStart, 4) === 'MPF\u0000'
        ) {
            throw new ImageInspectionFailure(
                'animated_content',
                'Multi-picture JPEG files are not supported.',
            );
        }
        cursor += segmentLength;
    }

    malformed();
}

function parseWebP(bytes: Uint8Array): ParsedStaticImage {
    if (bytes.byteLength < 20 || readU32Le(bytes, 4) + 8 !== bytes.byteLength) malformed();
    let cursor = 12;
    let canvas: { width: number; height: number } | undefined;
    let image: { width: number; height: number } | undefined;

    while (cursor < bytes.byteLength) {
        if (cursor + 8 > bytes.byteLength) malformed();
        const type = ascii(bytes, cursor, 4);
        const length = readU32Le(bytes, cursor + 4);
        const dataStart = cursor + 8;
        const dataEnd = dataStart + length;
        const chunkEnd = dataEnd + (length % 2);
        if (dataEnd < dataStart || chunkEnd > bytes.byteLength) malformed();
        if (!/^[\x20-\x7e]{4}$/u.test(type)) malformed();

        if (type === 'ANIM' || type === 'ANMF') {
            throw new ImageInspectionFailure(
                'animated_content',
                'Animated WebP files are not supported.',
            );
        }
        if (type === 'VP8X') {
            if (canvas !== undefined || cursor !== 12 || length !== 10) malformed();
            const flags = bytes[dataStart];
            if (flags === undefined || (flags & 0x02) !== 0) {
                throw new ImageInspectionFailure(
                    'animated_content',
                    'Animated WebP files are not supported.',
                );
            }
            if ((flags & 0xc1) !== 0) malformed();
            canvas = {
                width: readU24Le(bytes, dataStart + 4) + 1,
                height: readU24Le(bytes, dataStart + 7) + 1,
            };
        } else if (type === 'VP8 ') {
            if (image !== undefined || length < 10) malformed();
            if (
                ((bytes[dataStart] ?? 1) & 1) !== 0 ||
                !hasBytes(bytes, dataStart + 3, [0x9d, 0x01, 0x2a])
            ) {
                malformed();
            }
            image = {
                width: readU16Le(bytes, dataStart + 6) & 0x3fff,
                height: readU16Le(bytes, dataStart + 8) & 0x3fff,
            };
        } else if (type === 'VP8L') {
            if (image !== undefined || length < 5 || bytes[dataStart] !== 0x2f) malformed();
            const bits = readU32Le(bytes, dataStart + 1);
            if (bits >>> 29 !== 0) malformed();
            image = {
                width: (bits & 0x3fff) + 1,
                height: ((bits >>> 14) & 0x3fff) + 1,
            };
        }
        cursor = chunkEnd;
    }
    if (cursor !== bytes.byteLength || image === undefined) malformed();
    const dimensions = canvas ?? image;
    if (
        dimensions.width < 1 ||
        dimensions.height < 1 ||
        (canvas !== undefined && (canvas.width !== image.width || canvas.height !== image.height))
    ) {
        malformed();
    }

    return { mediaType: 'image/webp', ...dimensions };
}

function imageLimitIssues(width: number, height: number): ContentInspectionIssue[] {
    const issues: ContentInspectionIssue[] = [];
    if (width > STATIC_IMAGE_MAX_WIDTH || height > STATIC_IMAGE_MAX_HEIGHT) {
        issues.push(
            Object.freeze({
                code: 'dimension_exceeded',
                message: 'The image width or height is too large.',
            }),
        );
    }
    const pixelCount = width * height;
    if (pixelCount > STATIC_IMAGE_MAX_PIXEL_COUNT) {
        issues.push(
            Object.freeze({
                code: 'pixel_count_exceeded',
                message: 'The decoded image contains too many pixels.',
            }),
        );
    }
    if (pixelCount * STATIC_IMAGE_RGBA_BYTES_PER_PIXEL > STATIC_IMAGE_MAX_DECODED_RGBA_BYTES) {
        issues.push(
            Object.freeze({
                code: 'decoded_size_exceeded',
                message: 'The decoded image requires too much memory.',
            }),
        );
    }

    return issues;
}

function invalid(code: ContentInspectionIssue['code'], message: string): ContentInspection<never> {
    return Object.freeze({
        valid: false,
        issues: Object.freeze([Object.freeze({ code, message })]),
    });
}

function malformed(): never {
    throw new ImageInspectionFailure(
        'malformed_content',
        'The file is not a valid supported image.',
    );
}

function validPngColor(bitDepth: number, colorType: number): boolean {
    const depths: Readonly<Record<number, readonly number[]>> = {
        0: [1, 2, 4, 8, 16],
        2: [8, 16],
        3: [1, 2, 4, 8],
        4: [8, 16],
        6: [8, 16],
    };
    return depths[colorType]?.includes(bitDepth) === true;
}

function isJpegFrameMarker(marker: number): boolean {
    return (
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    );
}

function findJpegEntropyMarker(bytes: Uint8Array, start: number): number | undefined {
    let cursor = start;
    while (cursor < bytes.byteLength) {
        if (bytes[cursor] !== 0xff) {
            cursor++;
            continue;
        }
        const markerStart = cursor;
        while (bytes[cursor] === 0xff) cursor++;
        const marker = bytes[cursor];
        if (marker === 0x00 || (marker !== undefined && marker >= 0xd0 && marker <= 0xd7)) {
            cursor++;
            continue;
        }
        return markerStart;
    }

    return undefined;
}

function crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
    }

    return (crc ^ 0xffffffff) >>> 0;
}

function hasBytes(bytes: Uint8Array, offset: number, expected: readonly number[]): boolean {
    return expected.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
    if (offset < 0 || offset + length > bytes.byteLength) return '';
    return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function readU16Be(bytes: Uint8Array, offset: number): number {
    return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function readU16Le(bytes: Uint8Array, offset: number): number {
    return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
}

function readU24Le(bytes: Uint8Array, offset: number): number {
    return (
        (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16)
    );
}

function readU32Be(bytes: Uint8Array, offset: number): number {
    return (
        ((bytes[offset] ?? 0) * 0x1000000 +
            ((bytes[offset + 1] ?? 0) << 16) +
            ((bytes[offset + 2] ?? 0) << 8) +
            (bytes[offset + 3] ?? 0)) >>>
        0
    );
}

function readU32Le(bytes: Uint8Array, offset: number): number {
    return (
        ((bytes[offset] ?? 0) +
            ((bytes[offset + 1] ?? 0) << 8) +
            ((bytes[offset + 2] ?? 0) << 16) +
            (bytes[offset + 3] ?? 0) * 0x1000000) >>>
        0
    );
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
}
