import type { ValidateFunction } from 'ajv';
import type {
    CtxBrokerMetadataV1,
    CtxDpopClaimsV1,
    CtxDpopHeaderV1,
    CtxErrorV1,
    CtxHpkeEnvelopeV1,
    CtxProviderMetadataV1,
    CtxTicketClaimsV1,
    CtxTicketHeaderV1,
    CtxTicketProofClaimsV1,
    CtxTicketProofHeaderV1,
    CtxTicketSigningJwksV1,
} from '../contracts.js';

export const providerMetadataValidator: ValidateFunction<CtxProviderMetadataV1>;
export const brokerMetadataValidator: ValidateFunction<CtxBrokerMetadataV1>;
export const ticketHeaderValidator: ValidateFunction<CtxTicketHeaderV1>;
export const ticketClaimsValidator: ValidateFunction<CtxTicketClaimsV1>;
export const dpopHeaderValidator: ValidateFunction<CtxDpopHeaderV1>;
export const dpopClaimsValidator: ValidateFunction<CtxDpopClaimsV1>;
export const ticketProofHeaderValidator: ValidateFunction<CtxTicketProofHeaderV1>;
export const ticketProofClaimsValidator: ValidateFunction<CtxTicketProofClaimsV1>;
export const ticketSigningJwksValidator: ValidateFunction<CtxTicketSigningJwksV1>;
export const hpkeEnvelopeValidator: ValidateFunction<CtxHpkeEnvelopeV1>;
export const errorValidator: ValidateFunction<CtxErrorV1>;
