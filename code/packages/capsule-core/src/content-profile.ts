export interface ContentProfileRegistration {
    readonly id: string;
    readonly version: string;
    readonly mediaTypes: readonly string[];
}

export interface ContentProfile<TDeclaration, TMetadata> extends ContentProfileRegistration {
    validateDeclaration(declaration: TDeclaration): TMetadata;
}

export interface StaticImageProfileDeclarationV1 {
    readonly contentProfile: {
        readonly id: string;
        readonly version: string;
    };
    readonly payload: {
        readonly media_type: string;
        readonly plaintext_size: number;
        readonly profile_metadata: {
            readonly width: number;
            readonly height: number;
            readonly pixel_count: number;
        };
    };
}

export interface StaticImageMetadataV1 {
    readonly mediaType: StaticImageMediaTypeV1;
    readonly encodedBytes: number;
    readonly width: number;
    readonly height: number;
    readonly pixelCount: number;
    readonly nominalDecodedRgbaBytes: number;
}

export interface ContentProfileValidationIssue {
    readonly code:
        | 'decoded_size_exceeded'
        | 'encoded_size_exceeded'
        | 'invalid_dimension'
        | 'invalid_encoded_size'
        | 'pixel_count_exceeded'
        | 'pixel_count_mismatch'
        | 'unsupported_media_type'
        | 'unsupported_profile';
    readonly path: string;
    readonly message: string;
}

export const STATIC_IMAGE_PROFILE_ID = 'ctx.content.static-image' as const;
export const STATIC_IMAGE_PROFILE_VERSION = '1.0' as const;
export const STATIC_IMAGE_MEDIA_TYPES = Object.freeze([
    'image/jpeg',
    'image/png',
    'image/webp',
] as const);
export type StaticImageMediaTypeV1 = (typeof STATIC_IMAGE_MEDIA_TYPES)[number];

export const STATIC_IMAGE_MAX_ENCODED_BYTES = 25 * 1024 * 1024;
export const STATIC_IMAGE_MAX_WIDTH = 16_384;
export const STATIC_IMAGE_MAX_HEIGHT = 16_384;
export const STATIC_IMAGE_MAX_PIXEL_COUNT = 40_000_000;
export const STATIC_IMAGE_RGBA_BYTES_PER_PIXEL = 4;
export const STATIC_IMAGE_MAX_DECODED_RGBA_BYTES = 160_000_000;

export class ContentProfileValidationError extends Error {
    public constructor(public readonly issues: readonly ContentProfileValidationIssue[]) {
        super('Content profile declaration validation failed.');
        this.name = 'ContentProfileValidationError';
    }
}

export class UnsupportedContentProfileError extends Error {
    public readonly code = 'unsupported_content_profile' as const;

    public constructor() {
        super('The requested content profile is not supported.');
        this.name = 'UnsupportedContentProfileError';
    }
}

export class DuplicateContentProfileError extends Error {
    public readonly code = 'duplicate_content_profile' as const;

    public constructor() {
        super('A content profile identifier and version may be registered only once.');
        this.name = 'DuplicateContentProfileError';
    }
}

export class ContentProfileRegistry<TProfile extends ContentProfileRegistration> {
    private readonly profilesByIdentity: ReadonlyMap<string, TProfile>;

    public constructor(profiles: readonly TProfile[]) {
        const byIdentity = new Map<string, TProfile>();
        for (const profile of profiles) {
            const identity = contentProfileIdentity(profile.id, profile.version);
            if (byIdentity.has(identity)) throw new DuplicateContentProfileError();
            byIdentity.set(identity, profile);
        }
        this.profilesByIdentity = byIdentity;
    }

    public resolve(id: unknown, version: unknown): TProfile {
        if (typeof id !== 'string' || typeof version !== 'string') {
            throw new UnsupportedContentProfileError();
        }
        const profile = this.profilesByIdentity.get(contentProfileIdentity(id, version));
        if (profile === undefined) throw new UnsupportedContentProfileError();

        return profile;
    }

    public list(): readonly TProfile[] {
        return Object.freeze([...this.profilesByIdentity.values()]);
    }
}

export class StaticImageProfileV1 implements ContentProfile<
    StaticImageProfileDeclarationV1,
    StaticImageMetadataV1
> {
    public readonly id = STATIC_IMAGE_PROFILE_ID;
    public readonly version = STATIC_IMAGE_PROFILE_VERSION;
    public readonly mediaTypes = STATIC_IMAGE_MEDIA_TYPES;

    public validateDeclaration(
        declaration: StaticImageProfileDeclarationV1,
    ): StaticImageMetadataV1 {
        const issues: ContentProfileValidationIssue[] = [];
        const { contentProfile, payload } = declaration;

        if (
            contentProfile.id !== STATIC_IMAGE_PROFILE_ID ||
            contentProfile.version !== STATIC_IMAGE_PROFILE_VERSION
        ) {
            issues.push({
                code: 'unsupported_profile',
                path: '/content_profile',
                message: 'must identify the supported V1 static-image profile',
            });
        }

        if (!isStaticImageMediaType(payload.media_type)) {
            issues.push({
                code: 'unsupported_media_type',
                path: '/payloads/0/media_type',
                message: 'must be a supported V1 static-image media type',
            });
        }

        if (!Number.isSafeInteger(payload.plaintext_size) || payload.plaintext_size < 1) {
            issues.push({
                code: 'invalid_encoded_size',
                path: '/payloads/0/plaintext_size',
                message: 'must be a positive safe integer byte length',
            });
        } else if (payload.plaintext_size > STATIC_IMAGE_MAX_ENCODED_BYTES) {
            issues.push({
                code: 'encoded_size_exceeded',
                path: '/payloads/0/plaintext_size',
                message: 'exceeds the V1 static-image encoded-size limit',
            });
        }

        validateDimension(
            payload.profile_metadata.width,
            STATIC_IMAGE_MAX_WIDTH,
            '/payloads/0/profile_metadata/width',
            issues,
        );
        validateDimension(
            payload.profile_metadata.height,
            STATIC_IMAGE_MAX_HEIGHT,
            '/payloads/0/profile_metadata/height',
            issues,
        );

        const { width, height, pixel_count: pixelCount } = payload.profile_metadata;
        const calculatedPixelCount = width * height;
        if (!Number.isSafeInteger(pixelCount) || pixelCount < 1) {
            issues.push({
                code: 'pixel_count_mismatch',
                path: '/payloads/0/profile_metadata/pixel_count',
                message: 'must be a positive safe integer pixel count',
            });
        } else {
            if (pixelCount !== calculatedPixelCount) {
                issues.push({
                    code: 'pixel_count_mismatch',
                    path: '/payloads/0/profile_metadata/pixel_count',
                    message: 'must equal width multiplied by height',
                });
            }

            if (pixelCount > STATIC_IMAGE_MAX_PIXEL_COUNT) {
                issues.push({
                    code: 'pixel_count_exceeded',
                    path: '/payloads/0/profile_metadata/pixel_count',
                    message: 'exceeds the V1 static-image pixel-count limit',
                });
            }
        }

        const nominalDecodedRgbaBytes = pixelCount * STATIC_IMAGE_RGBA_BYTES_PER_PIXEL;
        if (
            Number.isFinite(nominalDecodedRgbaBytes) &&
            nominalDecodedRgbaBytes > STATIC_IMAGE_MAX_DECODED_RGBA_BYTES
        ) {
            issues.push({
                code: 'decoded_size_exceeded',
                path: '/payloads/0/profile_metadata/pixel_count',
                message: 'exceeds the V1 nominal decoded RGBA byte limit',
            });
        }

        if (issues.length > 0) {
            throw new ContentProfileValidationError(issues);
        }

        return Object.freeze({
            mediaType: payload.media_type as StaticImageMediaTypeV1,
            encodedBytes: payload.plaintext_size,
            width,
            height,
            pixelCount,
            nominalDecodedRgbaBytes,
        });
    }
}

export const STATIC_IMAGE_PROFILE_V1 = Object.freeze(new StaticImageProfileV1());
export const TRUSTED_CONTENT_PROFILES = Object.freeze([STATIC_IMAGE_PROFILE_V1] as const);
export const CONTENT_PROFILE_REGISTRY = Object.freeze(
    new ContentProfileRegistry(TRUSTED_CONTENT_PROFILES),
);

export function resolveContentProfile(
    profileId: unknown,
    profileVersion: unknown,
): typeof STATIC_IMAGE_PROFILE_V1 {
    return CONTENT_PROFILE_REGISTRY.resolve(profileId, profileVersion);
}

export function isStaticImageMediaType(value: unknown): value is StaticImageMediaTypeV1 {
    return STATIC_IMAGE_MEDIA_TYPES.some((mediaType) => mediaType === value);
}

function validateDimension(
    value: number,
    maximum: number,
    path: string,
    issues: ContentProfileValidationIssue[],
): void {
    if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
        issues.push({
            code: 'invalid_dimension',
            path,
            message: `must be an integer from 1 through ${maximum}`,
        });
    }
}

function contentProfileIdentity(id: string, version: string): string {
    return `${id}\u0000${version}`;
}
