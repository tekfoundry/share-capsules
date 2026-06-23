import {
    canonicalizeJsonBytes,
    decodeBase64Url,
    encodeBase64Url,
} from '@sharecapsules/capsule-core';

import {
    CREATOR_SIGNING_ALGORITHM,
    type CreatorSigningKeyRecord,
    type RecoveredCreatorSigningKey,
} from './creator-signing-key.js';

export const CREATOR_RECOVERY_BUNDLE_TYPE = 'share-capsules-creator-key-recovery' as const;
export const CREATOR_RECOVERY_BUNDLE_VERSION = 1 as const;
export const CREATOR_RECOVERY_CODE_BYTES = 32;
export const CREATOR_RECOVERY_SALT_BYTES = 16;
export const CREATOR_RECOVERY_NONCE_BYTES = 12;
export const CREATOR_RECOVERY_KDF = 'HKDF-SHA-256' as const;
export const CREATOR_RECOVERY_ENCRYPTION = 'AES-256-GCM' as const;
export const CREATOR_RECOVERY_MAX_CIPHERTEXT_BYTES = 4096;
const CREATOR_RECOVERY_MAX_SERIALIZED_BUNDLE_BYTES = 16_384;

const RECOVERY_KEY_INFO = new TextEncoder().encode(
    'share-capsules-creator-signing-key-recovery-v1',
);
const KEY_MATCH_CHALLENGE = new TextEncoder().encode(
    'share-capsules-creator-signing-key-recovery-match-v1',
);

export interface CreatorSigningKeyRecoveryBundleV1 {
    readonly type: typeof CREATOR_RECOVERY_BUNDLE_TYPE;
    readonly version: typeof CREATOR_RECOVERY_BUNDLE_VERSION;
    readonly key: {
        readonly id: string;
        readonly algorithm: typeof CREATOR_SIGNING_ALGORITHM;
        readonly public_key: string;
        readonly created_at: string;
    };
    readonly kdf: {
        readonly algorithm: typeof CREATOR_RECOVERY_KDF;
        readonly salt: string;
    };
    readonly encryption: {
        readonly algorithm: typeof CREATOR_RECOVERY_ENCRYPTION;
        readonly nonce: string;
    };
    readonly ciphertext: string;
}

export interface CreatorSigningKeyRecoveryMaterials {
    readonly recoveryCode: string;
    readonly bundle: CreatorSigningKeyRecoveryBundleV1;
}

export interface RecoveryRandomSource {
    bytes(length: number): Uint8Array;
}

export class CreatorSigningKeyRecoveryError extends Error {
    public constructor(
        public readonly code:
            | 'creation_failed'
            | 'invalid_bundle'
            | 'invalid_recovery_code'
            | 'recovery_failed',
    ) {
        super(code);
        this.name = 'CreatorSigningKeyRecoveryError';
    }
}

export class CreatorSigningKeyRecoveryService {
    public constructor(
        private readonly subtle: SubtleCrypto = crypto.subtle,
        private readonly randomness: RecoveryRandomSource = {
            bytes: (length) => crypto.getRandomValues(new Uint8Array(length)),
        },
    ) {}

    public async create(key: CreatorSigningKeyRecord): Promise<CreatorSigningKeyRecoveryMaterials> {
        let recoveryCodeBytes: Uint8Array | undefined;
        let plaintext: Uint8Array | undefined;
        try {
            if (key.status !== 'active') {
                throw new CreatorSigningKeyRecoveryError('creation_failed');
            }
            recoveryCodeBytes = this.randomBytes(CREATOR_RECOVERY_CODE_BYTES);
            const salt = this.randomBytes(CREATOR_RECOVERY_SALT_BYTES);
            const nonce = this.randomBytes(CREATOR_RECOVERY_NONCE_BYTES);
            const recoveryCode = encodeBase64Url(recoveryCodeBytes);
            const privateKey = new Uint8Array(await this.subtle.exportKey('pkcs8', key.privateKey));
            try {
                plaintext = canonicalizeJsonBytes({
                    type: 'share-capsules-creator-signing-key',
                    version: 1,
                    key_id: key.id,
                    algorithm: key.algorithm,
                    public_key: key.publicKey,
                    private_key_pkcs8: encodeBase64Url(privateKey),
                    created_at: key.createdAt,
                });
            } finally {
                privateKey.fill(0);
            }

            const header = recoveryHeader(key, salt, nonce);
            const encryptionKey = await this.deriveEncryptionKey(recoveryCodeBytes, salt, [
                'encrypt',
            ]);
            const ciphertext = new Uint8Array(
                await this.subtle.encrypt(
                    {
                        name: 'AES-GCM',
                        iv: toArrayBuffer(nonce),
                        additionalData: toArrayBuffer(canonicalizeJsonBytes(header)),
                        tagLength: 128,
                    },
                    encryptionKey,
                    toArrayBuffer(plaintext),
                ),
            );
            return Object.freeze({
                recoveryCode,
                bundle: Object.freeze({
                    ...header,
                    ciphertext: encodeBase64Url(ciphertext),
                }),
            });
        } catch (error) {
            if (error instanceof CreatorSigningKeyRecoveryError) throw error;
            throw new CreatorSigningKeyRecoveryError('creation_failed');
        } finally {
            recoveryCodeBytes?.fill(0);
            plaintext?.fill(0);
        }
    }

    public async recover(
        bundleInput: unknown,
        recoveryCode: string,
    ): Promise<RecoveredCreatorSigningKey> {
        const bundle = parseCreatorSigningKeyRecoveryBundle(bundleInput);
        const code = parseRecoveryCode(recoveryCode);

        let plaintextBytes: Uint8Array | undefined;
        let privateBytes: Uint8Array | undefined;
        try {
            const salt = decodeBase64Url(bundle.kdf.salt);
            const nonce = decodeBase64Url(bundle.encryption.nonce);
            const encryptionKey = await this.deriveEncryptionKey(code, salt, ['decrypt']);
            plaintextBytes = new Uint8Array(
                await this.subtle.decrypt(
                    {
                        name: 'AES-GCM',
                        iv: toArrayBuffer(nonce),
                        additionalData: toArrayBuffer(
                            canonicalizeJsonBytes(recoveryHeaderFromBundle(bundle)),
                        ),
                        tagLength: 128,
                    },
                    encryptionKey,
                    toArrayBuffer(decodeBase64Url(bundle.ciphertext)),
                ),
            );
            const plaintext = parseRecoveryPlaintext(plaintextBytes);
            if (
                plaintext.key_id !== bundle.key.id ||
                plaintext.algorithm !== bundle.key.algorithm ||
                plaintext.public_key !== bundle.key.public_key ||
                plaintext.created_at !== bundle.key.created_at
            ) {
                throw new CreatorSigningKeyRecoveryError('recovery_failed');
            }
            privateBytes = decodeBase64Url(plaintext.private_key_pkcs8);
            const privateKey = await this.subtle.importKey(
                'pkcs8',
                toArrayBuffer(privateBytes),
                { name: CREATOR_SIGNING_ALGORITHM },
                true,
                ['sign'],
            );
            await this.assertKeyMatch(privateKey, bundle.key.public_key);

            return Object.freeze({
                id: bundle.key.id,
                algorithm: CREATOR_SIGNING_ALGORITHM,
                publicKey: bundle.key.public_key,
                privateKey,
                createdAt: bundle.key.created_at,
            });
        } catch (error) {
            if (error instanceof CreatorSigningKeyRecoveryError) throw error;
            throw new CreatorSigningKeyRecoveryError('recovery_failed');
        } finally {
            code.fill(0);
            plaintextBytes?.fill(0);
            privateBytes?.fill(0);
        }
    }

    private randomBytes(length: number): Uint8Array {
        const value = this.randomness.bytes(length);
        if (value.byteLength !== length) {
            throw new CreatorSigningKeyRecoveryError('creation_failed');
        }

        return value;
    }

    private async deriveEncryptionKey(
        recoveryCode: Uint8Array,
        salt: Uint8Array,
        usages: readonly KeyUsage[],
    ): Promise<CryptoKey> {
        const material = await this.subtle.importKey(
            'raw',
            toArrayBuffer(recoveryCode),
            'HKDF',
            false,
            ['deriveKey'],
        );
        return this.subtle.deriveKey(
            {
                name: 'HKDF',
                hash: 'SHA-256',
                salt: toArrayBuffer(salt),
                info: toArrayBuffer(RECOVERY_KEY_INFO),
            },
            material,
            { name: 'AES-GCM', length: 256 },
            false,
            [...usages],
        );
    }

    private async assertKeyMatch(privateKey: CryptoKey, publicKey: string): Promise<void> {
        const verificationKey = await this.subtle.importKey(
            'raw',
            toArrayBuffer(decodeBase64Url(publicKey)),
            { name: CREATOR_SIGNING_ALGORITHM },
            false,
            ['verify'],
        );
        const signature = await this.subtle.sign(
            CREATOR_SIGNING_ALGORITHM,
            privateKey,
            KEY_MATCH_CHALLENGE,
        );
        if (
            !(await this.subtle.verify(
                CREATOR_SIGNING_ALGORITHM,
                verificationKey,
                signature,
                KEY_MATCH_CHALLENGE,
            ))
        ) {
            throw new CreatorSigningKeyRecoveryError('recovery_failed');
        }
    }
}

interface RecoveryPlaintext {
    readonly type: 'share-capsules-creator-signing-key';
    readonly version: 1;
    readonly key_id: string;
    readonly algorithm: typeof CREATOR_SIGNING_ALGORITHM;
    readonly public_key: string;
    readonly private_key_pkcs8: string;
    readonly created_at: string;
}

function recoveryHeader(
    key: CreatorSigningKeyRecord,
    salt: Uint8Array,
    nonce: Uint8Array,
): Omit<CreatorSigningKeyRecoveryBundleV1, 'ciphertext'> {
    return Object.freeze({
        type: CREATOR_RECOVERY_BUNDLE_TYPE,
        version: CREATOR_RECOVERY_BUNDLE_VERSION,
        key: Object.freeze({
            id: key.id,
            algorithm: CREATOR_SIGNING_ALGORITHM,
            public_key: key.publicKey,
            created_at: key.createdAt,
        }),
        kdf: Object.freeze({
            algorithm: CREATOR_RECOVERY_KDF,
            salt: encodeBase64Url(salt),
        }),
        encryption: Object.freeze({
            algorithm: CREATOR_RECOVERY_ENCRYPTION,
            nonce: encodeBase64Url(nonce),
        }),
    });
}

function recoveryHeaderFromBundle(
    bundle: CreatorSigningKeyRecoveryBundleV1,
): Omit<CreatorSigningKeyRecoveryBundleV1, 'ciphertext'> {
    return {
        type: bundle.type,
        version: bundle.version,
        key: bundle.key,
        kdf: bundle.kdf,
        encryption: bundle.encryption,
    };
}

export function parseCreatorSigningKeyRecoveryBundle(
    value: unknown,
): CreatorSigningKeyRecoveryBundleV1 {
    if (
        typeof value === 'string' &&
        new TextEncoder().encode(value).byteLength > CREATOR_RECOVERY_MAX_SERIALIZED_BUNDLE_BYTES
    ) {
        throw new CreatorSigningKeyRecoveryError('invalid_bundle');
    }
    const parsed = typeof value === 'string' ? parseJson(value) : value;
    const root = exactRecord(parsed, ['ciphertext', 'encryption', 'kdf', 'key', 'type', 'version']);
    const key = exactRecord(root.key, ['algorithm', 'created_at', 'id', 'public_key']);
    const kdf = exactRecord(root.kdf, ['algorithm', 'salt']);
    const encryption = exactRecord(root.encryption, ['algorithm', 'nonce']);
    if (
        root.type !== CREATOR_RECOVERY_BUNDLE_TYPE ||
        root.version !== CREATOR_RECOVERY_BUNDLE_VERSION ||
        key.algorithm !== CREATOR_SIGNING_ALGORITHM ||
        typeof key.id !== 'string' ||
        !/^creator_[a-f0-9]{32}$/u.test(key.id) ||
        typeof key.public_key !== 'string' ||
        !encodedLength(key.public_key, 32) ||
        typeof key.created_at !== 'string' ||
        !isCanonicalInstant(key.created_at) ||
        kdf.algorithm !== CREATOR_RECOVERY_KDF ||
        typeof kdf.salt !== 'string' ||
        !encodedLength(kdf.salt, CREATOR_RECOVERY_SALT_BYTES) ||
        encryption.algorithm !== CREATOR_RECOVERY_ENCRYPTION ||
        typeof encryption.nonce !== 'string' ||
        !encodedLength(encryption.nonce, CREATOR_RECOVERY_NONCE_BYTES) ||
        typeof root.ciphertext !== 'string' ||
        !encodedLengthBetween(root.ciphertext, 17, CREATOR_RECOVERY_MAX_CIPHERTEXT_BYTES)
    ) {
        throw new CreatorSigningKeyRecoveryError('invalid_bundle');
    }

    return root as unknown as CreatorSigningKeyRecoveryBundleV1;
}

function parseRecoveryPlaintext(value: Uint8Array): RecoveryPlaintext {
    let parsed: unknown;
    try {
        parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(value)) as unknown;
    } catch {
        throw new CreatorSigningKeyRecoveryError('recovery_failed');
    }
    const root = exactRecord(
        parsed,
        ['algorithm', 'created_at', 'key_id', 'private_key_pkcs8', 'public_key', 'type', 'version'],
        'recovery_failed',
    );
    if (
        root.type !== 'share-capsules-creator-signing-key' ||
        root.version !== 1 ||
        root.algorithm !== CREATOR_SIGNING_ALGORITHM ||
        typeof root.key_id !== 'string' ||
        typeof root.public_key !== 'string' ||
        typeof root.private_key_pkcs8 !== 'string' ||
        !encodedLengthBetween(root.private_key_pkcs8, 32, 512) ||
        typeof root.created_at !== 'string'
    ) {
        throw new CreatorSigningKeyRecoveryError('recovery_failed');
    }

    return root as unknown as RecoveryPlaintext;
}

function parseRecoveryCode(value: string): Uint8Array {
    if (!encodedLength(value, CREATOR_RECOVERY_CODE_BYTES)) {
        throw new CreatorSigningKeyRecoveryError('invalid_recovery_code');
    }

    return decodeBase64Url(value);
}

function exactRecord(
    value: unknown,
    keys: readonly string[],
    errorCode: 'invalid_bundle' | 'recovery_failed' = 'invalid_bundle',
): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new CreatorSigningKeyRecoveryError(errorCode);
    }
    const record = value as Record<string, unknown>;
    const actual = Object.keys(record).sort();
    if (
        actual.length !== keys.length ||
        actual.some((key, index) => key !== [...keys].sort()[index])
    ) {
        throw new CreatorSigningKeyRecoveryError(errorCode);
    }

    return record;
}

function parseJson(value: string): unknown {
    try {
        return JSON.parse(value) as unknown;
    } catch {
        throw new CreatorSigningKeyRecoveryError('invalid_bundle');
    }
}

function encodedLength(value: string, length: number): boolean {
    try {
        return decodeBase64Url(value).byteLength === length;
    } catch {
        return false;
    }
}

function encodedLengthBetween(value: string, minimum: number, maximum: number): boolean {
    try {
        const length = decodeBase64Url(value).byteLength;
        return length >= minimum && length <= maximum;
    } catch {
        return false;
    }
}

function isCanonicalInstant(value: string): boolean {
    const milliseconds = Date.parse(value);
    return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
}
