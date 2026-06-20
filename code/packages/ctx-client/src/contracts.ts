import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { decodeBase64Url } from '@sharecapsules/capsule-core';

import contractsSchema from './schema/ctx-contracts-v1.schema.json' with { type: 'json' };

export const CTX_PROTOCOL_VERSION = 'ctx-1' as const;
export const CTX_DISCOVERY_SUFFIX = 'ctx-configuration' as const;
export const CTX_TICKET_TYPE = 'ctx-key-release+jwt' as const;
export const CTX_TICKET_ALGORITHM = 'EdDSA' as const;
export const CTX_TICKET_LIFETIME_SECONDS = 60 as const;
export const CTX_DPOP_TYPE = 'dpop+jwt' as const;
export const CTX_TICKET_PROOF_TYPE = 'ctx-key-release-proof+jwt' as const;
export const CTX_DPOP_MAX_AGE_SECONDS = 60 as const;
export const CTX_CLOCK_SKEW_SECONDS = 5 as const;
export const CTX_ACTION = 'render' as const;
export const CTX_CRYPTOGRAPHIC_SUITE = 'ctx-capsule-v1' as const;

export interface CtxProviderMetadataV1 {
    readonly issuer: string;
    readonly protocol_versions_supported: readonly [typeof CTX_PROTOCOL_VERSION];
    readonly authorization_endpoint: string;
    readonly ticket_redemption_endpoint: string;
    readonly jwks_uri: string;
    readonly ticket_types_supported: readonly [typeof CTX_TICKET_TYPE];
    readonly ticket_signing_alg_values_supported: readonly [typeof CTX_TICKET_ALGORITHM];
    readonly dpop_signing_alg_values_supported: readonly [typeof CTX_TICKET_ALGORITHM];
}

export interface CtxBrokerMetadataV1 {
    readonly broker: string;
    readonly protocol_versions_supported: readonly [typeof CTX_PROTOCOL_VERSION];
    readonly key_release_endpoint: string;
    readonly ticket_types_supported: readonly [typeof CTX_TICKET_TYPE];
    readonly cryptographic_suites_supported: readonly [typeof CTX_CRYPTOGRAPHIC_SUITE];
}

export interface CtxTicketHeaderV1 {
    readonly typ: typeof CTX_TICKET_TYPE;
    readonly alg: typeof CTX_TICKET_ALGORITHM;
    readonly kid: string;
}

export interface CtxTicketClaimsV1 {
    readonly iss: string;
    readonly aud: string;
    readonly jti: string;
    readonly iat: number;
    readonly nbf: number;
    readonly exp: number;
    readonly ctx: {
        readonly version: 1;
        readonly capsule_id: string;
        readonly capsule_revision: number;
        readonly policy_sha256: string;
        readonly payload_id: string;
        readonly release_handle: string;
        readonly action: typeof CTX_ACTION;
        readonly cryptographic_suite: typeof CTX_CRYPTOGRAPHIC_SUITE;
        readonly proof_jkt: string;
        readonly agreement_jkt: string;
    };
}

export interface Ed25519PublicJwk {
    readonly kty: 'OKP';
    readonly crv: 'Ed25519';
    readonly x: string;
}

export interface CtxTicketSigningJwkV1 extends Ed25519PublicJwk {
    readonly use: 'sig';
    readonly alg: typeof CTX_TICKET_ALGORITHM;
    readonly kid: string;
}

export interface CtxTicketSigningJwksV1 {
    readonly keys: readonly CtxTicketSigningJwkV1[];
}

export interface CtxDpopHeaderV1 {
    readonly typ: typeof CTX_DPOP_TYPE;
    readonly alg: typeof CTX_TICKET_ALGORITHM;
    readonly jwk: Ed25519PublicJwk;
}

export interface CtxDpopClaimsV1 {
    readonly jti: string;
    readonly htm: 'POST';
    readonly htu: string;
    readonly iat: number;
    readonly ath: string;
    readonly nonce?: string;
}

export interface CtxTicketProofHeaderV1 {
    readonly typ: typeof CTX_TICKET_PROOF_TYPE;
    readonly alg: typeof CTX_TICKET_ALGORITHM;
    readonly jwk: Ed25519PublicJwk;
}

export interface CtxTicketProofClaimsV1 {
    readonly jti: string;
    readonly htm: 'POST';
    readonly htu: string;
    readonly iat: number;
    readonly tth: string;
    readonly nonce?: string;
}

export interface CtxHpkeEnvelopeV1 {
    readonly type: 'ctx-key-release';
    readonly version: 1;
    readonly ticket_jti: string;
    readonly cryptographic_suite: typeof CTX_CRYPTOGRAPHIC_SUITE;
    readonly enc: string;
    readonly ciphertext: string;
}

export const CTX_ERROR_CODES = Object.freeze([
    'invalid_request',
    'authentication_required',
    'email_verification_required',
    'account_unavailable',
    'device_registration_required',
    'consent_required',
    'policy_unsatisfied',
    'capsule_limit_reached',
    'account_capsule_limit_reached',
    'automation_risk_high',
    'unsupported_contract',
    'invalid_proof',
    'invalid_ticket',
    'ticket_expired',
    'ticket_replayed',
    'release_unavailable',
    'temporarily_unavailable',
] as const);

export type CtxErrorCodeV1 = (typeof CTX_ERROR_CODES)[number];

export interface CtxErrorV1 {
    readonly type: 'ctx-error';
    readonly version: 1;
    readonly code: CtxErrorCodeV1;
    readonly retryable: boolean;
    readonly correlation_id?: string;
}

export interface ContractValidationIssue {
    readonly path: string;
    readonly message: string;
}

export class ContractValidationError extends Error {
    public constructor(public readonly issues: readonly ContractValidationIssue[]) {
        super('CTX contract validation failed.');
        this.name = 'ContractValidationError';
    }
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(contractsSchema);

const schemaId = contractsSchema.$id;
const providerValidator = compileDefinition<CtxProviderMetadataV1>('providerMetadata');
const brokerValidator = compileDefinition<CtxBrokerMetadataV1>('brokerMetadata');
const ticketHeaderValidator = compileDefinition<CtxTicketHeaderV1>('ticketHeader');
const ticketClaimsValidator = compileDefinition<CtxTicketClaimsV1>('ticketClaims');
const dpopHeaderValidator = compileDefinition<CtxDpopHeaderV1>('dpopHeader');
const dpopClaimsValidator = compileDefinition<CtxDpopClaimsV1>('dpopClaims');
const ticketProofHeaderValidator = compileDefinition<CtxTicketProofHeaderV1>('ticketProofHeader');
const ticketProofClaimsValidator = compileDefinition<CtxTicketProofClaimsV1>('ticketProofClaims');
const ticketSigningJwksValidator = compileDefinition<CtxTicketSigningJwksV1>('ticketSigningJwks');
const hpkeEnvelopeValidator = compileDefinition<CtxHpkeEnvelopeV1>('hpkeEnvelope');
const errorValidator = compileDefinition<CtxErrorV1>('error');

export function ctxDiscoveryUrl(identifier: string): string {
    const url = parseSecureUrl(identifier, '/identifier');
    const path = url.pathname === '/' ? '' : url.pathname;
    return `${url.origin}/.well-known/${CTX_DISCOVERY_SUFFIX}${path}`;
}

export function parseCtxProviderMetadataV1(
    value: unknown,
    expectedIssuer?: string,
): CtxProviderMetadataV1 {
    const metadata = parseWithSchema(providerValidator, value);
    validateServiceUrls(
        [
            ['/issuer', metadata.issuer],
            ['/authorization_endpoint', metadata.authorization_endpoint],
            ['/ticket_redemption_endpoint', metadata.ticket_redemption_endpoint],
            ['/jwks_uri', metadata.jwks_uri],
        ],
        expectedIssuer === undefined ? [] : [['/issuer', metadata.issuer, expectedIssuer]],
    );
    return deepFreeze(structuredClone(metadata));
}

export function parseCtxBrokerMetadataV1(
    value: unknown,
    expectedBroker?: string,
): CtxBrokerMetadataV1 {
    const metadata = parseWithSchema(brokerValidator, value);
    validateServiceUrls(
        [
            ['/broker', metadata.broker],
            ['/key_release_endpoint', metadata.key_release_endpoint],
        ],
        expectedBroker === undefined ? [] : [['/broker', metadata.broker, expectedBroker]],
    );
    return deepFreeze(structuredClone(metadata));
}

export function parseCtxTicketHeaderV1(value: unknown): CtxTicketHeaderV1 {
    return deepFreeze(structuredClone(parseWithSchema(ticketHeaderValidator, value)));
}

export function parseCtxTicketSigningJwksV1(value: unknown): CtxTicketSigningJwksV1 {
    const jwks = parseWithSchema(ticketSigningJwksValidator, value);
    const identifiers = new Set<string>();
    const issues: ContractValidationIssue[] = [];
    for (const [index, key] of jwks.keys.entries()) {
        validateEncodedLength(key.x, 32, `/keys/${index}/x`, issues);
        if (identifiers.has(key.kid)) {
            issues.push({
                path: `/keys/${index}/kid`,
                message: 'must be unique within the key set',
            });
        }
        identifiers.add(key.kid);
    }
    throwIfIssues(issues);
    return deepFreeze(structuredClone(jwks));
}

export interface TicketValidationContext {
    readonly issuer: string;
    readonly audience: string;
    readonly now: number;
    readonly clockSkewSeconds?: number;
}

export function parseCtxTicketClaimsV1(
    value: unknown,
    context?: TicketValidationContext,
): CtxTicketClaimsV1 {
    const claims = parseWithSchema(ticketClaimsValidator, value);
    validateServiceUrls([
        ['/iss', claims.iss],
        ['/aud', claims.aud],
    ]);

    const issues: ContractValidationIssue[] = [];
    validateEncodedLength(claims.ctx.policy_sha256, 32, '/ctx/policy_sha256', issues);
    validateEncodedLength(claims.ctx.proof_jkt, 32, '/ctx/proof_jkt', issues);
    validateEncodedLength(claims.ctx.agreement_jkt, 32, '/ctx/agreement_jkt', issues);
    if (claims.nbf > claims.iat) {
        issues.push({ path: '/nbf', message: 'must be less than or equal to iat' });
    }
    if (claims.exp - claims.iat !== CTX_TICKET_LIFETIME_SECONDS) {
        issues.push({ path: '/exp', message: 'must equal iat plus 60 seconds' });
    }
    if (context !== undefined) {
        const skew = context.clockSkewSeconds ?? CTX_CLOCK_SKEW_SECONDS;
        validateIntegerRange(skew, 0, CTX_CLOCK_SKEW_SECONDS, '/clockSkewSeconds', issues);
        validateIntegerRange(context.now, 0, Number.MAX_SAFE_INTEGER, '/now', issues);
        if (claims.iss !== context.issuer) {
            issues.push({ path: '/iss', message: 'must exactly match the expected issuer' });
        }
        if (claims.aud !== context.audience) {
            issues.push({ path: '/aud', message: 'must exactly match the expected broker' });
        }
        if (context.now + skew < claims.nbf) {
            issues.push({ path: '/nbf', message: 'ticket is not yet valid' });
        }
        if (context.now - skew >= claims.exp) {
            issues.push({ path: '/exp', message: 'ticket has expired' });
        }
    }
    throwIfIssues(issues);
    return deepFreeze(structuredClone(claims));
}

export function parseCtxDpopHeaderV1(value: unknown): CtxDpopHeaderV1 {
    const header = parseWithSchema(dpopHeaderValidator, value);
    const issues: ContractValidationIssue[] = [];
    validateEncodedLength(header.jwk.x, 32, '/jwk/x', issues);
    throwIfIssues(issues);
    return deepFreeze(structuredClone(header));
}

export interface DpopValidationContext {
    readonly htu: string;
    readonly ath: string;
    readonly now: number;
    readonly nonce?: string;
    readonly clockSkewSeconds?: number;
    readonly maxAgeSeconds?: number;
}

export function parseCtxDpopClaimsV1(
    value: unknown,
    context?: DpopValidationContext,
): CtxDpopClaimsV1 {
    const claims = parseWithSchema(dpopClaimsValidator, value);
    const issues: ContractValidationIssue[] = [];
    validateEncodedLength(claims.ath, 32, '/ath', issues);
    throwIfIssues(issues);
    validateFreshProof(claims, context, 'ath', 'must match the presented access token');
    return deepFreeze(structuredClone(claims));
}

export function parseCtxTicketProofHeaderV1(value: unknown): CtxTicketProofHeaderV1 {
    const header = parseWithSchema(ticketProofHeaderValidator, value);
    const issues: ContractValidationIssue[] = [];
    validateEncodedLength(header.jwk.x, 32, '/jwk/x', issues);
    throwIfIssues(issues);
    return deepFreeze(structuredClone(header));
}

export interface TicketProofValidationContext {
    readonly htu: string;
    readonly tth: string;
    readonly now: number;
    readonly nonce?: string;
    readonly clockSkewSeconds?: number;
    readonly maxAgeSeconds?: number;
}

export function parseCtxTicketProofClaimsV1(
    value: unknown,
    context?: TicketProofValidationContext,
): CtxTicketProofClaimsV1 {
    const claims = parseWithSchema(ticketProofClaimsValidator, value);
    const issues: ContractValidationIssue[] = [];
    validateEncodedLength(claims.tth, 32, '/tth', issues);
    throwIfIssues(issues);
    validateFreshProof(claims, context, 'tth', 'must match the presented ticket');
    return deepFreeze(structuredClone(claims));
}

export function parseCtxHpkeEnvelopeV1(value: unknown): CtxHpkeEnvelopeV1 {
    const envelope = parseWithSchema(hpkeEnvelopeValidator, value);
    const issues: ContractValidationIssue[] = [];
    validateEncodedLength(envelope.enc, 32, '/enc', issues);
    validateEncodedLength(envelope.ciphertext, 48, '/ciphertext', issues);
    throwIfIssues(issues);
    return deepFreeze(structuredClone(envelope));
}

export function parseCtxErrorV1(value: unknown): CtxErrorV1 {
    return deepFreeze(structuredClone(parseWithSchema(errorValidator, value)));
}

function compileDefinition<T>(name: string): ValidateFunction<T> {
    return ajv.compile<T>({ $ref: `${schemaId}#/$defs/${name}` });
}

function parseWithSchema<T>(validator: ValidateFunction<T>, value: unknown): T {
    if (!validator(value)) {
        throw new ContractValidationError(schemaIssues(validator.errors));
    }
    return value;
}

function validateServiceUrls(
    values: readonly (readonly [string, string])[],
    exactMatches: readonly (readonly [string, string, string])[] = [],
): void {
    const issues: ContractValidationIssue[] = [];
    for (const [path, value] of values) {
        try {
            parseSecureUrl(value, path);
        } catch (error) {
            if (error instanceof ContractValidationError) issues.push(...error.issues);
            else throw error;
        }
    }
    for (const [path, actual, expected] of exactMatches) {
        if (actual !== expected)
            issues.push({ path, message: 'must exactly match the requested identity' });
    }
    throwIfIssues(issues);
}

function parseSecureUrl(value: string, path: string): URL {
    try {
        const url = new URL(value);
        if (
            url.protocol !== 'https:' ||
            url.username !== '' ||
            url.password !== '' ||
            url.search !== '' ||
            url.hash !== ''
        ) {
            throw new Error('unsupported URL component');
        }
        return url;
    } catch {
        throw new ContractValidationError([
            {
                path,
                message: 'must be an absolute HTTPS URL without credentials, query, or fragment',
            },
        ]);
    }
}

function validateFreshProof<K extends 'ath' | 'tth'>(
    claims: { readonly htu: string; readonly iat: number; readonly nonce?: string } & Record<
        K,
        string
    >,
    context:
        | ({
              readonly htu: string;
              readonly now: number;
              readonly nonce?: string;
              readonly clockSkewSeconds?: number;
              readonly maxAgeSeconds?: number;
          } & Record<K, string>)
        | undefined,
    hashClaim: K,
    hashMessage: string,
): void {
    parseSecureUrl(claims.htu, '/htu');
    const url = new URL(claims.htu);
    const issues: ContractValidationIssue[] = [];
    if (url.search !== '' || url.hash !== '') {
        issues.push({ path: '/htu', message: 'must exclude query and fragment components' });
    }
    if (context !== undefined) {
        const skew = context.clockSkewSeconds ?? CTX_CLOCK_SKEW_SECONDS;
        const maxAge = context.maxAgeSeconds ?? CTX_DPOP_MAX_AGE_SECONDS;
        validateIntegerRange(skew, 0, CTX_CLOCK_SKEW_SECONDS, '/clockSkewSeconds', issues);
        validateIntegerRange(maxAge, 1, CTX_DPOP_MAX_AGE_SECONDS, '/maxAgeSeconds', issues);
        validateIntegerRange(context.now, 0, Number.MAX_SAFE_INTEGER, '/now', issues);
        if (claims.htu !== context.htu) {
            issues.push({ path: '/htu', message: 'must exactly match the HTTP target URI' });
        }
        if (String(claims[hashClaim]) !== String(context[hashClaim])) {
            issues.push({ path: `/${hashClaim}`, message: hashMessage });
        }
        if (claims.iat > context.now + skew || claims.iat < context.now - maxAge - skew) {
            issues.push({ path: '/iat', message: 'must be within the accepted proof window' });
        }
        if (context.nonce !== undefined && claims.nonce !== context.nonce) {
            issues.push({ path: '/nonce', message: 'must match the server-provided nonce' });
        }
    }
    throwIfIssues(issues);
}

function schemaIssues(errors: ErrorObject[] | null | undefined): ContractValidationIssue[] {
    return (errors ?? []).map((error) => ({
        path: error.instancePath || '/',
        message: error.message ?? 'is invalid',
    }));
}

function throwIfIssues(issues: ContractValidationIssue[]): void {
    if (issues.length > 0) throw new ContractValidationError(issues);
}

function validateEncodedLength(
    value: string,
    expectedBytes: number,
    path: string,
    issues: ContractValidationIssue[],
): void {
    try {
        if (decodeBase64Url(value).byteLength !== expectedBytes) {
            issues.push({ path, message: `must encode exactly ${expectedBytes} bytes` });
        }
    } catch {
        issues.push({ path, message: 'must use canonical unpadded base64url encoding' });
    }
}

function validateIntegerRange(
    value: number,
    minimum: number,
    maximum: number,
    path: string,
    issues: ContractValidationIssue[],
): void {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
        issues.push({ path, message: `must be a safe integer from ${minimum} through ${maximum}` });
    }
}

function deepFreeze<T>(value: T): T {
    if (value !== null && typeof value === 'object') {
        Object.freeze(value);
        for (const child of Object.values(value)) deepFreeze(child);
    }
    return value;
}
