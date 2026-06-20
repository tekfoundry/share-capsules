import {
    CTX_ERROR_CODES,
    ContractValidationError,
    createCtxHpkeContextV1,
    ctxDiscoveryUrl,
    ctxHpkeAadV1,
    ctxHpkeInfoV1,
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
    type CtxTicketClaimsV1,
} from '@sharecapsules/ctx-client';
import { describe, expect, it } from 'vitest';

const digest = 'A'.repeat(43);
const identifier = '0123456789abcdef0123456789abcdef';
const issuer = 'https://trust.example/tenant';
const broker = 'https://broker.example';
const authorizationEndpoint = 'https://trust.example/tenant/authorize';
const redemptionEndpoint = 'https://trust.example/tenant/redeem';
const keyReleaseEndpoint = 'https://broker.example/releases';

describe('CTX V1 discovery contracts', () => {
    it.each([
        ['https://trust.example', 'https://trust.example/.well-known/ctx-configuration'],
        ['https://trust.example/', 'https://trust.example/.well-known/ctx-configuration'],
        [
            'https://trust.example/tenant',
            'https://trust.example/.well-known/ctx-configuration/tenant',
        ],
        [
            'https://trust.example/tenant/',
            'https://trust.example/.well-known/ctx-configuration/tenant/',
        ],
    ])('derives RFC 8414-style discovery for %s', (identity, expected) => {
        expect(ctxDiscoveryUrl(identity)).toBe(expected);
    });

    it.each([
        'http://trust.example',
        'https://user:secret@trust.example',
        'https://trust.example?tenant=1',
        'https://trust.example#metadata',
        'not-a-url',
    ])('rejects unsafe discovery identity %s', (identity) => {
        expect(() => ctxDiscoveryUrl(identity)).toThrow(ContractValidationError);
    });

    it('accepts exact provider metadata and freezes it', () => {
        const metadata = parseCtxProviderMetadataV1(validProviderMetadata(), issuer);

        expect(metadata.issuer).toBe(issuer);
        expect(Object.isFrozen(metadata)).toBe(true);
        expect(Object.isFrozen(metadata.protocol_versions_supported)).toBe(true);
    });

    it('rejects an issuer mismatch, unknown field, unsafe endpoint, or unsupported algorithm', () => {
        expect(() =>
            parseCtxProviderMetadataV1(validProviderMetadata(), 'https://other.example'),
        ).toThrow(ContractValidationError);
        expect(() =>
            parseCtxProviderMetadataV1({ ...validProviderMetadata(), tenant: 'private' }),
        ).toThrow(ContractValidationError);
        expect(() =>
            parseCtxProviderMetadataV1({
                ...validProviderMetadata(),
                authorization_endpoint: 'http://trust.example/authorize',
            }),
        ).toThrow(ContractValidationError);
        expect(() =>
            parseCtxProviderMetadataV1({
                ...validProviderMetadata(),
                ticket_signing_alg_values_supported: ['RS256'],
            }),
        ).toThrow(ContractValidationError);
    });

    it('accepts exact broker metadata and rejects identity substitution', () => {
        expect(parseCtxBrokerMetadataV1(validBrokerMetadata(), broker).broker).toBe(broker);
        expect(() =>
            parseCtxBrokerMetadataV1(validBrokerMetadata(), 'https://other-broker.example'),
        ).toThrow(ContractValidationError);
    });

    it('accepts only public, purpose-bound Ed25519 ticket keys with unique identifiers', () => {
        expect(
            parseCtxTicketSigningJwksV1({
                keys: [
                    {
                        kty: 'OKP',
                        crv: 'Ed25519',
                        x: digest,
                        use: 'sig',
                        alg: 'EdDSA',
                        kid: identifier,
                    },
                ],
            }).keys,
        ).toHaveLength(1);
        expect(() =>
            parseCtxTicketSigningJwksV1({
                keys: [
                    {
                        kty: 'OKP',
                        crv: 'Ed25519',
                        x: digest,
                        use: 'sig',
                        alg: 'EdDSA',
                        kid: identifier,
                    },
                    {
                        kty: 'OKP',
                        crv: 'Ed25519',
                        x: digest,
                        use: 'sig',
                        alg: 'EdDSA',
                        kid: identifier,
                    },
                ],
            }),
        ).toThrow(ContractValidationError);
        expect(() =>
            parseCtxTicketSigningJwksV1({
                keys: [
                    {
                        kty: 'OKP',
                        crv: 'Ed25519',
                        x: digest,
                        d: digest,
                        use: 'sig',
                        alg: 'EdDSA',
                        kid: identifier,
                    },
                ],
            }),
        ).toThrow(ContractValidationError);
    });
});

describe('CTX V1 authorization ticket contracts', () => {
    it('pins a mutually exclusive ticket type, algorithm, and signing key identifier', () => {
        expect(
            parseCtxTicketHeaderV1({
                typ: 'ctx-key-release+jwt',
                alg: 'EdDSA',
                kid: identifier,
            }),
        ).toEqual({ typ: 'ctx-key-release+jwt', alg: 'EdDSA', kid: identifier });

        for (const invalid of [
            { typ: 'JWT', alg: 'EdDSA', kid: identifier },
            { typ: 'ctx-key-release+jwt', alg: 'none', kid: identifier },
            { typ: 'ctx-key-release+jwt', alg: 'EdDSA', kid: identifier, jwk: {} },
        ]) {
            expect(() => parseCtxTicketHeaderV1(invalid)).toThrow(ContractValidationError);
        }
    });

    it('accepts the exact 60-second ticket bound to broker, Capsule, policy, payload, release, and device keys', () => {
        const claims = parseCtxTicketClaimsV1(validTicketClaims(), {
            issuer,
            audience: broker,
            now: 1_750_000_010,
        });

        expect(claims.ctx.release_handle).toBe(identifier);
        expect(claims.ctx.proof_jkt).toBe(digest);
        expect(claims.ctx.agreement_jkt).toBe(digest);
        expect(Object.isFrozen(claims.ctx)).toBe(true);
    });

    it.each([
        ['issuer', { iss: 'https://other.example' }],
        ['audience', { aud: 'https://other-broker.example' }],
        ['lifetime', { exp: 1_750_000_061 }],
        ['not-before', { nbf: 1_750_000_001 }],
    ] as const)('rejects invalid ticket %s binding', (_, change) => {
        expect(() =>
            parseCtxTicketClaimsV1(
                { ...validTicketClaims(), ...change },
                {
                    issuer,
                    audience: broker,
                    now: 1_750_000_010,
                },
            ),
        ).toThrow(ContractValidationError);
    });

    it('rejects expired tickets and unknown claims', () => {
        expect(() =>
            parseCtxTicketClaimsV1(validTicketClaims(), {
                issuer,
                audience: broker,
                now: 1_750_000_066,
            }),
        ).toThrow(ContractValidationError);
        expect(() =>
            parseCtxTicketClaimsV1(validTicketClaims(), {
                issuer,
                audience: broker,
                now: 1_750_000_010,
                clockSkewSeconds: 6,
            }),
        ).toThrow(ContractValidationError);
        expect(() =>
            parseCtxTicketClaimsV1({ ...validTicketClaims(), sub: 'global-account-id' }),
        ).toThrow(ContractValidationError);
    });

    it('rejects non-canonical digest and thumbprint encodings', () => {
        const valid = validTicketClaims();
        const claims = {
            ...valid,
            ctx: { ...valid.ctx, policy_sha256: `${'A'.repeat(42)}B` },
        };

        expect(() => parseCtxTicketClaimsV1(claims)).toThrow(ContractValidationError);
    });

    it.each(['release_handle', 'policy_sha256', 'proof_jkt', 'agreement_jkt'])(
        'rejects omission of security binding %s',
        (binding) => {
            const claims = structuredClone(validTicketClaims()) as unknown as Record<
                string,
                unknown
            > & {
                ctx: Record<string, unknown>;
            };
            delete claims.ctx[binding];
            expect(() => parseCtxTicketClaimsV1(claims)).toThrow(ContractValidationError);
        },
    );
});

describe('CTX V1 DPoP contract', () => {
    it('pins Ed25519 public-key proof headers without private or extra key material', () => {
        expect(
            parseCtxDpopHeaderV1({
                typ: 'dpop+jwt',
                alg: 'EdDSA',
                jwk: { kty: 'OKP', crv: 'Ed25519', x: digest },
            }),
        ).toEqual({
            typ: 'dpop+jwt',
            alg: 'EdDSA',
            jwk: { kty: 'OKP', crv: 'Ed25519', x: digest },
        });
        expect(() =>
            parseCtxDpopHeaderV1({
                typ: 'dpop+jwt',
                alg: 'EdDSA',
                jwk: { kty: 'OKP', crv: 'Ed25519', x: digest, d: digest },
            }),
        ).toThrow(ContractValidationError);
    });

    it('accepts a current token-bound POST proof for the exact endpoint', () => {
        expect(
            parseCtxDpopClaimsV1(validDpopClaims(), {
                htu: authorizationEndpoint,
                ath: digest,
                now: 1_750_000_010,
            }).htm,
        ).toBe('POST');
    });

    it.each([
        ['method', { htm: 'GET' }],
        ['endpoint', { htu: `${authorizationEndpoint}/other` }],
        ['token hash', { ath: 'B'.repeat(43) }],
        ['stale time', { iat: 1_749_999_900 }],
    ] as const)('rejects a proof with wrong %s', (_, change) => {
        expect(() =>
            parseCtxDpopClaimsV1(
                { ...validDpopClaims(), ...change },
                {
                    htu: authorizationEndpoint,
                    ath: digest,
                    now: 1_750_000_010,
                },
            ),
        ).toThrow(ContractValidationError);
    });

    it('requires an issued nonce when the server requests one', () => {
        expect(() =>
            parseCtxDpopClaimsV1(validDpopClaims(), {
                htu: authorizationEndpoint,
                ath: digest,
                now: 1_750_000_010,
                nonce: identifier,
            }),
        ).toThrow(ContractValidationError);
        expect(() =>
            parseCtxDpopClaimsV1(validDpopClaims(), {
                htu: authorizationEndpoint,
                ath: digest,
                now: 1_750_000_010,
                maxAgeSeconds: 61,
            }),
        ).toThrow(ContractValidationError);
    });

    it('uses a distinct proof type and ticket hash for broker key release', () => {
        expect(
            parseCtxTicketProofHeaderV1({
                typ: 'ctx-key-release-proof+jwt',
                alg: 'EdDSA',
                jwk: { kty: 'OKP', crv: 'Ed25519', x: digest },
            }).typ,
        ).toBe('ctx-key-release-proof+jwt');

        expect(
            parseCtxTicketProofClaimsV1(
                {
                    jti: identifier,
                    htm: 'POST',
                    htu: keyReleaseEndpoint,
                    iat: 1_750_000_000,
                    tth: digest,
                },
                { htu: keyReleaseEndpoint, tth: digest, now: 1_750_000_010 },
            ).tth,
        ).toBe(digest);

        expect(() =>
            parseCtxTicketProofClaimsV1(
                {
                    jti: identifier,
                    htm: 'POST',
                    htu: keyReleaseEndpoint,
                    iat: 1_750_000_000,
                    tth: 'B'.repeat(43),
                },
                { htu: keyReleaseEndpoint, tth: digest, now: 1_750_000_010 },
            ),
        ).toThrow(ContractValidationError);
    });
});

describe('CTX V1 HPKE and error contracts', () => {
    it('binds HPKE info to the complete release context in canonical bytes', () => {
        const claims = parseCtxTicketClaimsV1(validTicketClaims());
        const context = createCtxHpkeContextV1(claims);
        const info = new TextDecoder().decode(ctxHpkeInfoV1(claims));

        expect(context.release_handle).toBe(identifier);
        expect(context.agreement_jkt).toBe(digest);
        expect(info.startsWith('CTX-Key-Release-HPKE-v1\0{')).toBe(true);
        expect(info).toContain(`"ticket_jti":"${identifier}"`);
    });

    it('binds HPKE authenticated data to the exact compact ticket', async () => {
        const first = await ctxHpkeAadV1('header.payload.signature');
        const second = await ctxHpkeAadV1('header.payload.other-signature');

        expect(new TextDecoder().decode(first).startsWith('CTX-Key-Release-AAD-v1\0{')).toBe(true);
        expect(first).not.toEqual(second);
    });

    it('accepts exactly one 32-byte HPKE encapsulated key and 48-byte encrypted content key', () => {
        expect(
            parseCtxHpkeEnvelopeV1({
                type: 'ctx-key-release',
                version: 1,
                ticket_jti: identifier,
                cryptographic_suite: 'ctx-capsule-v1',
                enc: 'A'.repeat(43),
                ciphertext: 'A'.repeat(64),
            }).ticket_jti,
        ).toBe(identifier);
        expect(() =>
            parseCtxHpkeEnvelopeV1({
                type: 'ctx-key-release',
                version: 1,
                ticket_jti: identifier,
                cryptographic_suite: 'ctx-capsule-v1',
                enc: `${'A'.repeat(42)}B`,
                ciphertext: 'A'.repeat(64),
            }),
        ).toThrow(ContractValidationError);
    });

    it('locks privacy-safe errors to stable codes without descriptive or account fields', () => {
        for (const code of CTX_ERROR_CODES) {
            expect(
                parseCtxErrorV1({ type: 'ctx-error', version: 1, code, retryable: false }).code,
            ).toBe(code);
        }
        expect(() =>
            parseCtxErrorV1({
                type: 'ctx-error',
                version: 1,
                code: 'policy_unsatisfied',
                retryable: false,
                detail: 'Account 42 viewed 900 Capsules today',
            }),
        ).toThrow(ContractValidationError);
    });
});

function validProviderMetadata() {
    return {
        issuer,
        protocol_versions_supported: ['ctx-1'],
        authorization_endpoint: authorizationEndpoint,
        ticket_redemption_endpoint: redemptionEndpoint,
        jwks_uri: 'https://trust.example/tenant/jwks.json',
        ticket_types_supported: ['ctx-key-release+jwt'],
        ticket_signing_alg_values_supported: ['EdDSA'],
        dpop_signing_alg_values_supported: ['EdDSA'],
    };
}

function validBrokerMetadata() {
    return {
        broker,
        protocol_versions_supported: ['ctx-1'],
        key_release_endpoint: keyReleaseEndpoint,
        ticket_types_supported: ['ctx-key-release+jwt'],
        cryptographic_suites_supported: ['ctx-capsule-v1'],
    };
}

function validTicketClaims(): CtxTicketClaimsV1 {
    return {
        iss: issuer,
        aud: broker,
        jti: identifier,
        iat: 1_750_000_000,
        nbf: 1_750_000_000,
        exp: 1_750_000_060,
        ctx: {
            version: 1,
            capsule_id: 'urn:uuid:123e4567-e89b-42d3-a456-426614174000',
            capsule_revision: 1,
            policy_sha256: digest,
            payload_id: 'primary-image',
            release_handle: identifier,
            action: 'render',
            cryptographic_suite: 'ctx-capsule-v1',
            proof_jkt: digest,
            agreement_jkt: digest,
        },
    };
}

function validDpopClaims() {
    return {
        jti: identifier,
        htm: 'POST',
        htu: authorizationEndpoint,
        iat: 1_750_000_000,
        ath: digest,
    };
}
