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
