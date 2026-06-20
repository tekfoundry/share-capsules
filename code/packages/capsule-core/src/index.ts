export {
    CAPSULE_CRYPTOGRAPHIC_SUITE_V1,
    CAPSULE_SUITE_ID,
    DIGEST_ALGORITHM_ID,
    HPKE_AEAD_ID,
    HPKE_KDF_ID,
    HPKE_KEM_ID,
    HPKE_MODE_ID,
    MANIFEST_SIGNATURE_ALGORITHM_ID,
    PAYLOAD_ENCRYPTION_ALGORITHM_ID,
    SUPPORTED_CAPSULE_SUITE_IDS,
    UnsupportedCryptographicSuiteError,
    isSupportedCapsuleSuiteId,
    resolveCapsuleCryptographicSuite,
} from './cryptographic-suite.js';

export type {
    CapsuleCryptographicSuiteV1,
    SupportedCapsuleCryptographicSuite,
} from './cryptographic-suite.js';

export {
    ED25519_PUBLIC_KEY_BYTES,
    ED25519_SIGNATURE_BYTES,
    ManifestSignatureError,
    canonicalizeCapsuleManifest,
    importEd25519PublicKey,
    signCapsuleManifest,
    signDetachedEd25519,
    verifyCapsuleManifestSignature,
    verifyDetachedEd25519,
} from './manifest-signature.js';

export type { Ed25519CryptoProvider } from './manifest-signature.js';

export {
    PAYLOAD_AAD_TYPE,
    PAYLOAD_AAD_VERSION,
    PayloadEncryptionError,
    WEB_CRYPTO_AES_GCM_ID,
    canonicalizePayloadAssociatedData,
    decryptAes256Gcm,
    decryptPayloadV1,
    encryptAes256Gcm,
    encryptPayloadV1,
    generatePayloadContentKey,
    generatePayloadNonce,
    payloadEncryptionContextFromManifest,
} from './payload-encryption.js';

export type {
    PayloadCryptoProvider,
    PayloadEncryptionContextV1,
    PayloadEncryptionResultV1,
    RandomByteFiller,
} from './payload-encryption.js';

export {
    CAPSULE_FORMAT_VERSION,
    CAPSULE_MANIFEST_TYPE,
    ManifestValidationError,
    expectedArchiveEntries,
    isPayloadId,
    parseCapsuleManifest,
    payloadPath,
    validateArchiveEntryNames,
} from './manifest.js';

export type { CapsuleManifestV1, CapsulePayloadV1, ManifestValidationIssue } from './manifest.js';
export {
    JsonCanonicalizationError,
    MAX_CANONICAL_JSON_DEPTH,
    canonicalizeJson,
    canonicalizeJsonBytes,
} from './canonical-json.js';

export type { JsonPrimitive, JsonValue } from './canonical-json.js';
export { Base64UrlError, decodeBase64Url, encodeBase64Url } from './base64url.js';

export {
    EntryCommitmentError,
    SHA256_BYTES,
    canonicalManifestSha256,
    sha256,
    sha256Base64Url,
    validateCapsuleEntryCommitments,
    validatePayloadEntryCommitment,
} from './entry-commitment.js';

export type { CapsuleArchiveEntryV1, DigestProvider } from './entry-commitment.js';

export {
    ContentProfileValidationError,
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
    StaticImageProfileV1,
    UnsupportedContentProfileError,
    isStaticImageMediaType,
    resolveContentProfile,
} from './content-profile.js';

export type {
    ContentProfile,
    ContentProfileValidationIssue,
    StaticImageMediaTypeV1,
    StaticImageMetadataV1,
    StaticImageProfileDeclarationV1,
} from './content-profile.js';
