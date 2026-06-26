import {
    ManifestValidationError,
    expectedArchiveEntries,
    isPayloadId,
    parseCapsuleManifest,
    validateArchiveEntryNames,
} from '@sharecapsules/capsule-core';
import { describe, expect, it } from 'vitest';

import { validManifestV1 } from './manifest-v1.js';

describe('Capsule Manifest V1', () => {
    it('accepts the shared valid fixture and derives the exact archive allowlist', () => {
        const manifest = parseCapsuleManifest(structuredClone(validManifestV1));

        expect(expectedArchiveEntries(manifest)).toEqual([
            'manifest.json',
            'manifest.sig',
            'payloads/primary.enc',
        ]);
    });

    it.each(['../secret', '/absolute', 'Primary', 'primary.png', 'primary_name', 'a--b'])(
        'rejects unsafe payload identifier %s',
        (payloadId) => {
            expect(isPayloadId(payloadId)).toBe(false);
        },
    );

    it('rejects a payload path that is not derived from its identifier', () => {
        const value = structuredClone(validManifestV1);
        value.payloads[0].path = 'payloads/something-else.enc';

        expect(() => parseCapsuleManifest(value)).toThrow(ManifestValidationError);
    });

    it('rejects unknown manifest fields', () => {
        const value = {
            ...structuredClone(validManifestV1),
            unsigned_behavior: 'ignore-policy',
        };

        expect(() => parseCapsuleManifest(value)).toThrow(ManifestValidationError);
    });

    it.each([
        [
            'unsupported manifest version',
            (value: MutableManifest) => {
                value.format_version = '2.0';
            },
        ],
        [
            'unsupported cryptographic suite',
            (value: MutableManifest) => {
                value.cryptographic_suite = 'ctx-capsule-v0';
            },
        ],
        [
            'integer boundary for plaintext size',
            (value: MutableManifest) => {
                value.payloads[0]!.plaintext_size = Number.MAX_SAFE_INTEGER + 1;
            },
        ],
        [
            'integer boundary for capsule revision',
            (value: MutableManifest) => {
                value.capsule.revision = Number.MAX_SAFE_INTEGER + 1;
            },
        ],
        [
            'malformed payload commitment',
            (value: MutableManifest) => {
                value.payloads[0]!.ciphertext_sha256 = 'not-base64url!';
            },
        ],
        [
            'malformed policy predicate',
            (value: MutableManifest) => {
                mutablePolicy(value).requirements[0]!.predicate = 'ctx.account.email-verified-v2';
            },
        ],
        [
            'unsupported policy version',
            (value: MutableManifest) => {
                mutablePolicy(value).version = 2;
            },
        ],
    ])('malicious manifest corpus rejects %s', (_, mutate) => {
        const value = structuredClone(validManifestV1) as unknown as MutableManifest;
        mutate(value);

        expect(() => parseCapsuleManifest(value)).toThrow(ManifestValidationError);
    });

    it.each(malformedJsonishValues())(
        'property-style manifest root parser rejects bounded JSON value %#',
        (value) => {
            expect(() => parseCapsuleManifest(value)).toThrow(ManifestValidationError);
        },
    );

    it.each([
        [
            'ctx issuer',
            (value: MutableManifest, replacement: unknown) => {
                value.ctx.issuer = replacement;
            },
        ],
        [
            'policy object',
            (value: MutableManifest, replacement: unknown) => {
                value.policy = replacement;
            },
        ],
        [
            'content profile object',
            (value: MutableManifest, replacement: unknown) => {
                value.content_profile = replacement;
            },
        ],
        [
            'payload media type',
            (value: MutableManifest, replacement: unknown) => {
                value.payloads[0].media_type = replacement;
            },
        ],
        [
            'image width metadata',
            (value: MutableManifest, replacement: unknown) => {
                value.payloads[0].profile_metadata.width = replacement;
            },
        ],
        [
            'image pixel-count metadata',
            (value: MutableManifest, replacement: unknown) => {
                value.payloads[0].profile_metadata.pixel_count = replacement;
            },
        ],
        [
            'key-release broker identity',
            (value: MutableManifest, replacement: unknown) => {
                value.payloads[0].key_release.broker = replacement;
            },
        ],
    ])('property-style manifest parser rejects malformed %s values', (_, mutate) => {
        for (const replacement of malformedJsonishValues()) {
            const value = structuredClone(validManifestV1) as unknown as MutableManifest;
            mutate(value, replacement);

            expect(() => parseCapsuleManifest(value)).toThrow(ManifestValidationError);
        }
    });

    it.each([
        'http://trust.example',
        'https://user:secret@trust.example',
        'https://trust.example?tenant=1',
        'https://trust.example#identity',
    ])('rejects unsafe CTX issuer identity %s before discovery', (issuer) => {
        const value = structuredClone(validManifestV1);
        value.ctx.issuer = issuer;

        expect(() => parseCapsuleManifest(value)).toThrow(ManifestValidationError);
    });

    it.each([
        'http://broker.example',
        'https://user:secret@broker.example',
        'https://broker.example?release=1',
        'https://broker.example#identity',
    ])('rejects unsafe broker identity %s before discovery', (broker) => {
        const value = structuredClone(validManifestV1);
        value.payloads[0].key_release.broker = broker;

        expect(() => parseCapsuleManifest(value)).toThrow(ManifestValidationError);
    });

    it.each(['http://localhost:3003', 'http://127.0.0.1:3004', 'http://[::1]:3004'])(
        'accepts loopback HTTP service identity %s for local development',
        (identity) => {
            const value = structuredClone(validManifestV1);
            value.ctx.issuer = identity;
            value.payloads[0].key_release.broker = identity;

            expect(parseCapsuleManifest(value)).toBeDefined();
        },
    );

    it.each(['http://localhost.example', 'http://127.0.0.2:3004'])(
        'rejects non-loopback HTTP service identity %s',
        (identity) => {
            const value = structuredClone(validManifestV1);
            value.ctx.issuer = identity;

            expect(() => parseCapsuleManifest(value)).toThrow(ManifestValidationError);
        },
    );

    it('rejects duplicate, missing, and undeclared archive entries', () => {
        const manifest = parseCapsuleManifest(structuredClone(validManifestV1));

        expect(() =>
            validateArchiveEntryNames(manifest, [
                'manifest.json',
                'manifest.sig',
                'manifest.sig',
                '../payloads/primary.enc',
            ]),
        ).toThrow(ManifestValidationError);
    });
});

interface MutableManifest {
    format_version: unknown;
    cryptographic_suite: unknown;
    capsule: {
        revision: unknown;
    };
    ctx: { issuer: unknown };
    policy: unknown;
    content_profile: unknown;
    payloads: [
        {
            plaintext_size: unknown;
            ciphertext_sha256: unknown;
            media_type: unknown;
            profile_metadata: {
                width: unknown;
                pixel_count: unknown;
            };
            key_release: {
                broker: unknown;
            };
        },
    ];
}

function mutablePolicy(value: MutableManifest): {
    version: unknown;
    requirements: Array<{ predicate: unknown }>;
} {
    return value.policy as {
        version: unknown;
        requirements: Array<{ predicate: unknown }>;
    };
}

function malformedJsonishValues(): readonly unknown[] {
    return Object.freeze([
        null,
        true,
        false,
        0,
        -1,
        1.5,
        Number.MAX_SAFE_INTEGER + 1,
        '',
        ' '.repeat(256),
        [],
        {},
        { type: 'future-v2' },
        { type: 'ctx-policy', version: 1, combiner: 'all', requirements: [] },
    ]);
}
