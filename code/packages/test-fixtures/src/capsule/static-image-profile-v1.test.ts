import {
    ContentProfileRegistry,
    ContentProfileValidationError,
    DuplicateContentProfileError,
    STATIC_IMAGE_MAX_DECODED_RGBA_BYTES,
    STATIC_IMAGE_MAX_ENCODED_BYTES,
    STATIC_IMAGE_MAX_HEIGHT,
    STATIC_IMAGE_MAX_PIXEL_COUNT,
    STATIC_IMAGE_MAX_WIDTH,
    STATIC_IMAGE_MEDIA_TYPES,
    STATIC_IMAGE_PROFILE_ID,
    STATIC_IMAGE_PROFILE_V1,
    STATIC_IMAGE_PROFILE_VERSION,
    STATIC_IMAGE_RGBA_BYTES_PER_PIXEL,
    UnsupportedContentProfileError,
    parseCapsuleManifest,
    resolveContentProfile,
    type StaticImageProfileDeclarationV1,
} from '@sharecapsules/capsule-core';
import { describe, expect, it } from 'vitest';

import { validManifestV1 } from './manifest-v1.js';

describe('Static Image Content Profile V1', () => {
    it('locks the exact profile identity, supported media types, and compatibility envelope', () => {
        expect(STATIC_IMAGE_PROFILE_V1).toMatchObject({
            id: 'ctx.content.static-image',
            version: '1.0',
            mediaTypes: ['image/jpeg', 'image/png', 'image/webp'],
        });
        expect(STATIC_IMAGE_PROFILE_ID).toBe('ctx.content.static-image');
        expect(STATIC_IMAGE_PROFILE_VERSION).toBe('1.0');
        expect(STATIC_IMAGE_MEDIA_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp']);
        expect(STATIC_IMAGE_MAX_ENCODED_BYTES).toBe(26_214_400);
        expect(STATIC_IMAGE_MAX_WIDTH).toBe(16_384);
        expect(STATIC_IMAGE_MAX_HEIGHT).toBe(16_384);
        expect(STATIC_IMAGE_MAX_PIXEL_COUNT).toBe(40_000_000);
        expect(STATIC_IMAGE_RGBA_BYTES_PER_PIXEL).toBe(4);
        expect(STATIC_IMAGE_MAX_DECODED_RGBA_BYTES).toBe(160_000_000);
    });

    it.each(STATIC_IMAGE_MEDIA_TYPES)('accepts static media type %s', (mediaType) => {
        const metadata = STATIC_IMAGE_PROFILE_V1.validateDeclaration(
            declaration({ media_type: mediaType }),
        );

        expect(metadata.mediaType).toBe(mediaType);
    });

    it('returns immutable normalized signed metadata including derived RGBA bytes', () => {
        const metadata = STATIC_IMAGE_PROFILE_V1.validateDeclaration(
            declaration({ width: 10_000, height: 4_000, pixel_count: 40_000_000 }),
        );

        expect(metadata).toEqual({
            mediaType: 'image/png',
            encodedBytes: 1024,
            width: 10_000,
            height: 4_000,
            pixelCount: 40_000_000,
            nominalDecodedRgbaBytes: 160_000_000,
        });
        expect(Object.isFrozen(metadata)).toBe(true);
    });

    it('accepts every envelope boundary exactly', () => {
        expect(() =>
            STATIC_IMAGE_PROFILE_V1.validateDeclaration(
                declaration({
                    plaintext_size: STATIC_IMAGE_MAX_ENCODED_BYTES,
                    width: STATIC_IMAGE_MAX_WIDTH,
                    height: 1,
                    pixel_count: STATIC_IMAGE_MAX_WIDTH,
                }),
            ),
        ).not.toThrow();
        expect(() =>
            STATIC_IMAGE_PROFILE_V1.validateDeclaration(
                declaration({
                    width: 1,
                    height: STATIC_IMAGE_MAX_HEIGHT,
                    pixel_count: STATIC_IMAGE_MAX_HEIGHT,
                }),
            ),
        ).not.toThrow();
        expect(() =>
            STATIC_IMAGE_PROFILE_V1.validateDeclaration(
                declaration({ width: 10_000, height: 4_000, pixel_count: 40_000_000 }),
            ),
        ).not.toThrow();
    });

    it.each([
        [
            'encoded bytes',
            { plaintext_size: STATIC_IMAGE_MAX_ENCODED_BYTES + 1 },
            'encoded_size_exceeded',
        ],
        [
            'width',
            { width: STATIC_IMAGE_MAX_WIDTH + 1, pixel_count: STATIC_IMAGE_MAX_WIDTH + 1 },
            'invalid_dimension',
        ],
        [
            'height',
            { height: STATIC_IMAGE_MAX_HEIGHT + 1, pixel_count: STATIC_IMAGE_MAX_HEIGHT + 1 },
            'invalid_dimension',
        ],
    ] as const)('rejects content beyond the %s limit', (_, changes, code) => {
        expectIssues(declaration(changes), code);
    });

    it('rejects pixel count and nominal decoded size beyond their shared V1 boundary', () => {
        const error = captureError(
            declaration({ width: 10_000, height: 4_001, pixel_count: 40_010_000 }),
        );

        expect(error.issues.map((issue) => issue.code)).toEqual([
            'pixel_count_exceeded',
            'decoded_size_exceeded',
        ]);
    });

    it.each([
        ['zero width', { width: 0, pixel_count: 0 }, 'invalid_dimension'],
        ['fractional height', { height: 1.5, pixel_count: 2 }, 'invalid_dimension'],
        ['zero encoded bytes', { plaintext_size: 0 }, 'invalid_encoded_size'],
        ['fractional encoded bytes', { plaintext_size: 1.5 }, 'invalid_encoded_size'],
        [
            'mismatched pixels',
            { width: 100, height: 100, pixel_count: 9_999 },
            'pixel_count_mismatch',
        ],
    ] as const)('rejects invalid signed metadata: %s', (_, changes, code) => {
        expectIssues(declaration(changes), code);
    });

    it.each(['image/gif', 'image/svg+xml', 'image/avif', '', 'IMAGE/PNG'])(
        'rejects unsupported or non-canonical media type %s',
        (mediaType) => {
            expectIssues(declaration({ media_type: mediaType }), 'unsupported_media_type');
        },
    );

    it.each([
        ['ctx.content.static-image', '2.0'],
        ['ctx.content.video', '1.0'],
        ['CTX.CONTENT.STATIC-IMAGE', '1.0'],
    ])('rejects unsupported profile %s version %s', (id, version) => {
        expectIssues(
            declaration({ profile_id: id, profile_version: version }),
            'unsupported_profile',
        );
        expect(() => resolveContentProfile(id, version)).toThrow(UnsupportedContentProfileError);
    });

    it('resolves only the exact trusted profile implementation', () => {
        expect(resolveContentProfile(STATIC_IMAGE_PROFILE_ID, STATIC_IMAGE_PROFILE_VERSION)).toBe(
            STATIC_IMAGE_PROFILE_V1,
        );
        expect(Object.isFrozen(STATIC_IMAGE_PROFILE_V1)).toBe(true);
        expect(Object.isFrozen(STATIC_IMAGE_MEDIA_TYPES)).toBe(true);
    });

    it('makes additional trusted profile registration an explicit composition step', () => {
        const textProfile = Object.freeze({
            id: 'ctx.content.plain-text',
            version: '1.0',
            mediaTypes: Object.freeze(['text/plain']),
        });
        const registry = new ContentProfileRegistry([STATIC_IMAGE_PROFILE_V1, textProfile]);

        expect(registry.resolve(textProfile.id, textProfile.version)).toBe(textProfile);
        expect(registry.list()).toEqual([STATIC_IMAGE_PROFILE_V1, textProfile]);
        expect(() => registry.resolve(textProfile.id, '2.0')).toThrow(
            UnsupportedContentProfileError,
        );
    });

    it('rejects ambiguous duplicate profile registrations', () => {
        expect(
            () => new ContentProfileRegistry([STATIC_IMAGE_PROFILE_V1, STATIC_IMAGE_PROFILE_V1]),
        ).toThrow(DuplicateContentProfileError);
    });

    it('keeps manifest parsing aligned with the profile envelope', () => {
        const oversized = structuredClone(validManifestV1);
        oversized.payloads[0].plaintext_size = STATIC_IMAGE_MAX_ENCODED_BYTES + 1;
        oversized.payloads[0].ciphertext_size = STATIC_IMAGE_MAX_ENCODED_BYTES + 17;

        expect(() => parseCapsuleManifest(oversized)).toThrow();
    });
});

interface DeclarationChanges {
    profile_id?: string;
    profile_version?: string;
    media_type?: string;
    plaintext_size?: number;
    width?: number;
    height?: number;
    pixel_count?: number;
}

function declaration(changes: DeclarationChanges = {}): StaticImageProfileDeclarationV1 {
    return {
        contentProfile: {
            id: changes.profile_id ?? STATIC_IMAGE_PROFILE_ID,
            version: changes.profile_version ?? STATIC_IMAGE_PROFILE_VERSION,
        },
        payload: {
            media_type: changes.media_type ?? 'image/png',
            plaintext_size: changes.plaintext_size ?? 1024,
            profile_metadata: {
                width: changes.width ?? 16,
                height: changes.height ?? 16,
                pixel_count: changes.pixel_count ?? 256,
            },
        },
    };
}

function captureError(declarationValue: StaticImageProfileDeclarationV1) {
    try {
        STATIC_IMAGE_PROFILE_V1.validateDeclaration(declarationValue);
    } catch (error) {
        if (error instanceof ContentProfileValidationError) {
            return error;
        }
        throw error;
    }

    throw new Error('Expected content profile validation to fail.');
}

function expectIssues(declarationValue: StaticImageProfileDeclarationV1, code: string): void {
    expect(captureError(declarationValue).issues.map((issue) => issue.code)).toContain(code);
}
