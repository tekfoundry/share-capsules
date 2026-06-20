import {
    CAPSULE_CRYPTOGRAPHIC_SUITE_V1,
    CAPSULE_SUITE_ID,
    ManifestValidationError,
    SUPPORTED_CAPSULE_SUITE_IDS,
    UnsupportedCryptographicSuiteError,
    isSupportedCapsuleSuiteId,
    parseCapsuleManifest,
    resolveCapsuleCryptographicSuite,
} from '@sharecapsules/capsule-core';
import { describe, expect, it } from 'vitest';

import { validManifestV1 } from './manifest-v1.js';

const unsupportedSuiteIds: readonly unknown[] = [
    undefined,
    null,
    '',
    'ctx-capsule-v0',
    'ctx-capsule-v2',
    'CTX-CAPSULE-V1',
    'ctx-capsule-v1 ',
    ['ctx-capsule-v1'],
    { id: 'ctx-capsule-v1' },
];

describe('Capsule Cryptographic Suite V1', () => {
    it('locks the V1 suite identifier and every selected primitive to exact values', () => {
        expect(CAPSULE_CRYPTOGRAPHIC_SUITE_V1).toEqual({
            id: 'ctx-capsule-v1',
            manifestSignature: {
                algorithm: 'Ed25519',
                publicKeyBytes: 32,
                signatureBytes: 64,
            },
            digest: {
                algorithm: 'SHA-256',
                outputBytes: 32,
            },
            payloadEncryption: {
                algorithm: 'AES-256-GCM',
                keyBytes: 32,
                nonceBytes: 12,
                tagBytes: 16,
            },
            contentKeyDelivery: {
                protocol: 'HPKE',
                mode: 'base',
                modeCode: 0x00,
                kem: 'DHKEM(X25519, HKDF-SHA256)',
                kemCode: 0x0020,
                kdf: 'HKDF-SHA256',
                kdfCode: 0x0001,
                aead: 'AES-256-GCM',
                aeadCode: 0x0002,
            },
        });
        expect(SUPPORTED_CAPSULE_SUITE_IDS).toEqual(['ctx-capsule-v1']);
    });

    it('exposes immutable suite definitions so runtime consumers cannot weaken them', () => {
        expect(Object.isFrozen(CAPSULE_CRYPTOGRAPHIC_SUITE_V1)).toBe(true);
        expect(Object.isFrozen(CAPSULE_CRYPTOGRAPHIC_SUITE_V1.manifestSignature)).toBe(true);
        expect(Object.isFrozen(CAPSULE_CRYPTOGRAPHIC_SUITE_V1.digest)).toBe(true);
        expect(Object.isFrozen(CAPSULE_CRYPTOGRAPHIC_SUITE_V1.payloadEncryption)).toBe(true);
        expect(Object.isFrozen(CAPSULE_CRYPTOGRAPHIC_SUITE_V1.contentKeyDelivery)).toBe(true);
        expect(Object.isFrozen(SUPPORTED_CAPSULE_SUITE_IDS)).toBe(true);
    });

    it('resolves only the exact V1 suite identifier', () => {
        expect(isSupportedCapsuleSuiteId(CAPSULE_SUITE_ID)).toBe(true);
        expect(resolveCapsuleCryptographicSuite(CAPSULE_SUITE_ID)).toBe(
            CAPSULE_CRYPTOGRAPHIC_SUITE_V1,
        );
    });

    it.each(unsupportedSuiteIds)(
        'rejects unsupported, malformed, future, or downgrade suite identifier %#',
        (suiteId) => {
            expect(isSupportedCapsuleSuiteId(suiteId)).toBe(false);
            expect(() => resolveCapsuleCryptographicSuite(suiteId)).toThrow(
                UnsupportedCryptographicSuiteError,
            );
        },
    );

    it.each(['ctx-capsule-v0', 'ctx-capsule-v2', 'CTX-CAPSULE-V1'])(
        'rejects manifest suite %s instead of negotiating or substituting V1',
        (suiteId) => {
            const value = {
                ...structuredClone(validManifestV1),
                cryptographic_suite: suiteId,
            };

            expect(() => parseCapsuleManifest(value)).toThrow(ManifestValidationError);
        },
    );

    it('rejects a manifest that omits the required suite identifier', () => {
        const value = structuredClone(validManifestV1) as unknown as Record<string, unknown>;
        delete value.cryptographic_suite;

        expect(() => parseCapsuleManifest(value)).toThrow(ManifestValidationError);
    });

    it.each(['ECDSA', 'Ed448', 'ed25519'])(
        'rejects manifest signature algorithm %s as a suite mismatch',
        (algorithm) => {
            const value = structuredClone(validManifestV1) as unknown as {
                creator: { signing_key: { algorithm: unknown } };
            };
            value.creator.signing_key.algorithm = algorithm;

            expect(() => parseCapsuleManifest(value)).toThrow(ManifestValidationError);
        },
    );

    it('rejects a payload-level algorithm override that attempts to weaken the suite', () => {
        const value = structuredClone(validManifestV1) as unknown as {
            payloads: [{ encryption: Record<string, unknown> }];
        };
        value.payloads[0].encryption.algorithm = 'AES-128-GCM';

        expect(() => parseCapsuleManifest(value)).toThrow(ManifestValidationError);
    });
});
