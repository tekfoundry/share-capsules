import Ajv2020, { type ErrorObject } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import { CAPSULE_SUITE_ID, MANIFEST_SIGNATURE_ALGORITHM_ID } from './cryptographic-suite.js';
import manifestSchema from './schema/capsule-manifest-v1.schema.json' with { type: 'json' };

export const CAPSULE_MANIFEST_TYPE = 'capsule-manifest' as const;
export const CAPSULE_FORMAT_VERSION = '1.0' as const;
export const STATIC_IMAGE_PROFILE_ID = 'ctx.content.static-image' as const;
export const STATIC_IMAGE_PROFILE_VERSION = '1.0' as const;

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
    policy: Record<string, unknown>;
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

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateManifestSchema = ajv.compile<CapsuleManifestV1>(manifestSchema);

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

    if (
        payload.profile_metadata.pixel_count !==
        payload.profile_metadata.width * payload.profile_metadata.height
    ) {
        issues.push({
            path: '/payloads/0/profile_metadata/pixel_count',
            message: 'must equal width multiplied by height',
        });
    }

    const predecessor = value.capsule.predecessor;
    if (predecessor !== undefined) {
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
