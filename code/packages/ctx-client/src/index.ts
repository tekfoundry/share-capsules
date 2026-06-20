/** Public entry point for provider-neutral CTX client behavior. */
export {
    CTX_ACTION,
    CTX_CLOCK_SKEW_SECONDS,
    CTX_CRYPTOGRAPHIC_SUITE,
    CTX_DISCOVERY_SUFFIX,
    CTX_DPOP_MAX_AGE_SECONDS,
    CTX_DPOP_TYPE,
    CTX_ERROR_CODES,
    CTX_PROTOCOL_VERSION,
    CTX_TICKET_ALGORITHM,
    CTX_TICKET_LIFETIME_SECONDS,
    CTX_TICKET_PROOF_TYPE,
    CTX_TICKET_TYPE,
    ContractValidationError,
    ctxDiscoveryUrl,
    parseCtxBrokerMetadataV1,
    parseCtxDpopClaimsV1,
    parseCtxDpopHeaderV1,
    parseCtxErrorV1,
    parseCtxHpkeEnvelopeV1,
    parseCtxProviderMetadataV1,
    parseCtxTicketClaimsV1,
    parseCtxTicketHeaderV1,
    parseCtxTicketProofClaimsV1,
    parseCtxTicketProofHeaderV1,
    parseCtxTicketSigningJwksV1,
} from './contracts.js';

export type {
    ContractValidationIssue,
    CtxBrokerMetadataV1,
    CtxDpopClaimsV1,
    CtxDpopHeaderV1,
    CtxErrorCodeV1,
    CtxErrorV1,
    CtxHpkeEnvelopeV1,
    CtxProviderMetadataV1,
    CtxTicketClaimsV1,
    CtxTicketHeaderV1,
    CtxTicketProofClaimsV1,
    CtxTicketProofHeaderV1,
    CtxTicketSigningJwkV1,
    CtxTicketSigningJwksV1,
    DpopValidationContext,
    Ed25519PublicJwk,
    TicketValidationContext,
    TicketProofValidationContext,
} from './contracts.js';

export {
    CTX_HPKE_AAD_LABEL,
    CTX_HPKE_INFO_LABEL,
    createCtxHpkeContextV1,
    ctxHpkeAadV1,
    ctxHpkeInfoV1,
} from './hpke-context.js';

export type { CtxHpkeContextV1 } from './hpke-context.js';

export {
    CTX_CONTENT_KEY_BYTES,
    CTX_HPKE_ENCAPSULATED_KEY_BYTES,
    CTX_HPKE_TAG_BYTES,
    CTX_X25519_KEY_BYTES,
    CtxHpkeError,
    deriveCtxX25519KeyPairForTest,
    importCtxX25519PrivateKey,
    importCtxX25519PublicKey,
    openCtxContentKeyV1,
    sealCtxContentKeyV1,
    serializeCtxX25519PrivateKey,
    serializeCtxX25519PublicKey,
} from './hpke.js';

export type { CtxHpkeSealResultV1 } from './hpke.js';
