export const CAPSULE_SUITE_ID = 'ctx-capsule-v1' as const;
export const MANIFEST_SIGNATURE_ALGORITHM_ID = 'Ed25519' as const;
export const DIGEST_ALGORITHM_ID = 'SHA-256' as const;
export const PAYLOAD_ENCRYPTION_ALGORITHM_ID = 'AES-256-GCM' as const;
export const HPKE_MODE_ID = 'base' as const;
export const HPKE_KEM_ID = 'DHKEM(X25519, HKDF-SHA256)' as const;
export const HPKE_KDF_ID = 'HKDF-SHA256' as const;
export const HPKE_AEAD_ID = 'AES-256-GCM' as const;

export interface CapsuleCryptographicSuiteV1 {
    readonly id: typeof CAPSULE_SUITE_ID;
    readonly manifestSignature: {
        readonly algorithm: typeof MANIFEST_SIGNATURE_ALGORITHM_ID;
        readonly publicKeyBytes: 32;
        readonly signatureBytes: 64;
    };
    readonly digest: {
        readonly algorithm: typeof DIGEST_ALGORITHM_ID;
        readonly outputBytes: 32;
    };
    readonly payloadEncryption: {
        readonly algorithm: typeof PAYLOAD_ENCRYPTION_ALGORITHM_ID;
        readonly keyBytes: 32;
        readonly nonceBytes: 12;
        readonly tagBytes: 16;
    };
    readonly contentKeyDelivery: {
        readonly protocol: 'HPKE';
        readonly mode: typeof HPKE_MODE_ID;
        readonly modeCode: 0x00;
        readonly kem: typeof HPKE_KEM_ID;
        readonly kemCode: 0x0020;
        readonly kdf: typeof HPKE_KDF_ID;
        readonly kdfCode: 0x0001;
        readonly aead: typeof HPKE_AEAD_ID;
        readonly aeadCode: 0x0002;
    };
}

export type SupportedCapsuleCryptographicSuite = CapsuleCryptographicSuiteV1;

export const CAPSULE_CRYPTOGRAPHIC_SUITE_V1: CapsuleCryptographicSuiteV1 = Object.freeze({
    id: CAPSULE_SUITE_ID,
    manifestSignature: Object.freeze({
        algorithm: MANIFEST_SIGNATURE_ALGORITHM_ID,
        publicKeyBytes: 32,
        signatureBytes: 64,
    }),
    digest: Object.freeze({
        algorithm: DIGEST_ALGORITHM_ID,
        outputBytes: 32,
    }),
    payloadEncryption: Object.freeze({
        algorithm: PAYLOAD_ENCRYPTION_ALGORITHM_ID,
        keyBytes: 32,
        nonceBytes: 12,
        tagBytes: 16,
    }),
    contentKeyDelivery: Object.freeze({
        protocol: 'HPKE',
        mode: HPKE_MODE_ID,
        modeCode: 0x00,
        kem: HPKE_KEM_ID,
        kemCode: 0x0020,
        kdf: HPKE_KDF_ID,
        kdfCode: 0x0001,
        aead: HPKE_AEAD_ID,
        aeadCode: 0x0002,
    }),
});

export const SUPPORTED_CAPSULE_SUITE_IDS: readonly (typeof CAPSULE_SUITE_ID)[] = Object.freeze([
    CAPSULE_SUITE_ID,
]);

export class UnsupportedCryptographicSuiteError extends Error {
    public readonly code = 'unsupported_cryptographic_suite' as const;

    public constructor() {
        super('The Capsule cryptographic suite is not supported.');
        this.name = 'UnsupportedCryptographicSuiteError';
    }
}

export function isSupportedCapsuleSuiteId(value: unknown): value is typeof CAPSULE_SUITE_ID {
    return value === CAPSULE_SUITE_ID;
}

export function resolveCapsuleCryptographicSuite(
    suiteId: unknown,
): SupportedCapsuleCryptographicSuite {
    if (!isSupportedCapsuleSuiteId(suiteId)) {
        throw new UnsupportedCryptographicSuiteError();
    }

    return CAPSULE_CRYPTOGRAPHIC_SUITE_V1;
}
