import type { ErrorObject } from 'ajv';

import { decodeBase64Url } from './base64url.js';
import {
    ContentProfileValidationError,
    STATIC_IMAGE_PROFILE_ID,
    STATIC_IMAGE_PROFILE_VERSION,
    resolveContentProfile,
} from './content-profile.js';
import { PolicyValidationError, validateCtxPolicyV1, type CtxPolicyV1 } from './policy.js';
import { validateManifestSchema } from './generated/schema-validators.js';
import { CAPSULE_SUITE_ID, MANIFEST_SIGNATURE_ALGORITHM_ID } from './cryptographic-suite.js';

export const CAPSULE_MANIFEST_TYPE = 'capsule-manifest' as const;
export const CAPSULE_FORMAT_VERSION = '1.0' as const;

const PAYLOAD_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const REQUIRED_ARCHIVE_ENTRIES = ['manifest.json', 'manifest.sig'] as const;

export interface CapsulePayloadV1 {
    id: string;
    path: string;
    media_type: 'image/jpeg' | 'image/png' | 'image/webp';
    plaintext_size: number;
    ciphertext_size: number;
    ciphertext_sha256: string;
    encryption: {
        representation: 'whole';
        nonce: string;
    };
    key_release: {
        broker: string;
        handle: string;
    };
    profile_metadata: {
        width: number;
        height: number;
        pixel_count: number;
    };
}

export interface CapsuleManifestV1 {
    type: typeof CAPSULE_MANIFEST_TYPE;
    format_version: typeof CAPSULE_FORMAT_VERSION;
    capsule: {
        id: string;
        revision: number;
        created_at: string;
        predecessor?: {
            id: string;
            revision: number;
            manifest_sha256: string;
        };
    };
    cryptographic_suite: typeof CAPSULE_SUITE_ID;
    creator: {
        signing_key: {
            id: string;
            algorithm: typeof MANIFEST_SIGNATURE_ALGORITHM_ID;
            public_key: string;
        };
    };
    content_profile: {
        id: typeof STATIC_IMAGE_PROFILE_ID;
        version: typeof STATIC_IMAGE_PROFILE_VERSION;
    };
    description?: {
        title?: string;
        description?: string;
        creator_display_name?: string;
        original_filename?: string;
    };
    policy: CtxPolicyV1;
    ctx: {
        issuer: string;
    };
    payloads: [CapsulePayloadV1];
}

export interface ManifestValidationIssue {
    path: string;
    message: string;
}

export class ManifestValidationError extends Error {
    public constructor(public readonly issues: readonly ManifestValidationIssue[]) {
        super('Capsule manifest validation failed.');
        this.name = 'ManifestValidationError';
    }
}

export function isPayloadId(value: string): boolean {
    return value.length <= 64 && PAYLOAD_ID_PATTERN.test(value);
}

export function payloadPath(payloadId: string): string {
    if (!isPayloadId(payloadId)) {
        throw new ManifestValidationError([
            { path: '/payloads/id', message: 'must be a valid V1 payload identifier' },
        ]);
    }

    return `payloads/${payloadId}.enc`;
}

export function parseCapsuleManifest(value: unknown): CapsuleManifestV1 {
    if (!validateManifestSchema(value)) {
        throw new ManifestValidationError(schemaIssues(validateManifestSchema.errors));
    }

    const issues: ManifestValidationIssue[] = [];
    const payload = value.payloads[0];

    validateSecureServiceUrl(value.ctx.issuer, '/ctx/issuer', issues);
    validateSecureServiceUrl(payload.key_release.broker, '/payloads/0/key_release/broker', issues);

    try {
        validateCtxPolicyV1(value.policy);
    } catch (error) {
        if (error instanceof PolicyValidationError) {
            for (const issue of error.issues) {
                issues.push({ path: `/policy${issue.path}`, message: issue.message });
            }
        } else {
            throw error;
        }
    }

    validateEncodedLength(
        value.creator.signing_key.public_key,
        32,
        '/creator/signing_key/public_key',
        issues,
    );
    validateEncodedLength(payload.ciphertext_sha256, 32, '/payloads/0/ciphertext_sha256', issues);
    validateEncodedLength(payload.encryption.nonce, 12, '/payloads/0/encryption/nonce', issues);

    if (payload.path !== payloadPath(payload.id)) {
        issues.push({
            path: '/payloads/0/path',
            message: 'must equal the path derived from the payload identifier',
        });
    }

    if (payload.ciphertext_size !== payload.plaintext_size + 16) {
        issues.push({
            path: '/payloads/0/ciphertext_size',
            message: 'must equal plaintext_size plus the 16-byte GCM tag',
        });
    }

    try {
        resolveContentProfile(
            value.content_profile.id,
            value.content_profile.version,
        ).validateDeclaration({
            contentProfile: value.content_profile,
            payload,
        });
    } catch (error) {
        if (error instanceof ContentProfileValidationError) {
            for (const issue of error.issues) {
                issues.push({ path: issue.path, message: issue.message });
            }
        } else {
            throw error;
        }
    }

    const predecessor = value.capsule.predecessor;
    if (predecessor !== undefined) {
        validateEncodedLength(
            predecessor.manifest_sha256,
            32,
            '/capsule/predecessor/manifest_sha256',
            issues,
        );

        if (predecessor.id === value.capsule.id) {
            issues.push({
                path: '/capsule/predecessor/id',
                message: 'must identify a different Capsule revision',
            });
        }

        if (predecessor.revision >= value.capsule.revision) {
            issues.push({
                path: '/capsule/predecessor/revision',
                message: 'must be lower than the current revision',
            });
        }
    } else if (value.capsule.revision !== 1) {
        issues.push({
            path: '/capsule/revision',
            message: 'must be 1 when no predecessor is declared',
        });
    }

    if (issues.length > 0) {
        throw new ManifestValidationError(issues);
    }

    return value;
}

export function expectedArchiveEntries(manifest: CapsuleManifestV1): readonly string[] {
    return [
        ...REQUIRED_ARCHIVE_ENTRIES,
        ...manifest.payloads.map((payload) => payload.path),
    ].sort();
}

export function validateArchiveEntryNames(
    manifest: CapsuleManifestV1,
    entryNames: readonly string[],
): void {
    const issues: ManifestValidationIssue[] = [];
    const seen = new Set<string>();

    for (const entryName of entryNames) {
        if (seen.has(entryName)) {
            issues.push({ path: '/archive', message: `contains duplicate entry: ${entryName}` });
        }
        seen.add(entryName);
    }

    const expected = expectedArchiveEntries(manifest);
    const actual = [...seen].sort();

    for (const entryName of expected) {
        if (!seen.has(entryName)) {
            issues.push({ path: '/archive', message: `is missing required entry: ${entryName}` });
        }
    }

    for (const entryName of actual) {
        if (!expected.includes(entryName)) {
            issues.push({ path: '/archive', message: `contains undeclared entry: ${entryName}` });
        }
    }

    if (issues.length > 0) {
        throw new ManifestValidationError(issues);
    }
}

function schemaIssues(errors: ErrorObject[] | null | undefined): ManifestValidationIssue[] {
    return (errors ?? []).map((error) => ({
        path: error.instancePath || '/',
        message: error.message ?? 'is invalid',
    }));
}

function validateEncodedLength(
    encoded: string,
    expectedBytes: number,
    path: string,
    issues: ManifestValidationIssue[],
): void {
    try {
        if (decodeBase64Url(encoded).byteLength !== expectedBytes) {
            issues.push({ path, message: `must encode exactly ${expectedBytes} bytes` });
        }
    } catch {
        issues.push({ path, message: 'must use canonical unpadded base64url encoding' });
    }
}

function validateSecureServiceUrl(
    value: string,
    path: string,
    issues: ManifestValidationIssue[],
): void {
    try {
        const url = new URL(value);
        if (
            (url.protocol !== 'https:' &&
                !(url.protocol === 'http:' && isLoopbackHostname(url.hostname))) ||
            url.username !== '' ||
            url.password !== '' ||
            url.search !== '' ||
            url.hash !== ''
        ) {
            throw new Error('unsupported URL component');
        }
    } catch {
        issues.push({
            path,
            message:
                'must be an absolute HTTPS identity, or a loopback HTTP identity for local development, without credentials, query, or fragment',
        });
    }
}

function isLoopbackHostname(hostname: string): boolean {
    return ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
}
