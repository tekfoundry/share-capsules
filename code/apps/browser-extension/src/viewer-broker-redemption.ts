import { decodeBase64Url, encodeBase64Url, sha256Base64Url } from '@sharecapsules/capsule-core';

import { openViewerContentKey, type ViewerTicketClaimsV1 } from './viewer-hpke.js';
import type { VerifiedViewerCapsuleSummary } from './viewer-capsule-verifier.js';
import { okpJwkThumbprint, type StoredViewerDeviceKeys } from './viewer-device.js';

export type ViewerBrokerRedemptionFailureCode =
    | 'invalid_ticket'
    | 'invalid_response'
    | 'rate_limited'
    | 'release_denied'
    | 'unwrap_failed'
    | 'network_error';

export type ViewerBrokerReleaseDenialCode =
    | 'invalid_request'
    | 'authentication_required'
    | 'email_verification_required'
    | 'account_unavailable'
    | 'device_registration_required'
    | 'consent_required'
    | 'policy_unsatisfied'
    | 'capsule_limit_reached'
    | 'account_capsule_limit_reached'
    | 'automation_risk_high'
    | 'challenge_required'
    | 'unsupported_contract'
    | 'invalid_proof'
    | 'invalid_ticket'
    | 'ticket_expired'
    | 'ticket_replayed'
    | 'release_unavailable'
    | 'temporarily_unavailable';

export type ViewerBrokerRedemptionResult =
    | {
          readonly ok: true;
          readonly contentKey: Uint8Array;
          readonly ticketJti: string;
      }
    | {
          readonly ok: false;
          readonly code: ViewerBrokerRedemptionFailureCode;
          readonly denialCode?: ViewerBrokerReleaseDenialCode;
          readonly retryable: boolean;
      };

export interface ViewerBrokerRedemptionOptions {
    readonly fetch?: typeof fetch;
    readonly proofFactory?: KeyReleaseProofProducer;
    readonly openContentKey?: typeof openViewerContentKey;
    readonly now?: () => number;
}

export interface KeyReleaseProofProducer {
    createProof(
        releaseEndpoint: string,
        ticket: string,
        device: StoredViewerDeviceKeys,
    ): Promise<string>;
}

export class ViewerBrokerRedemptionClient {
    public constructor(private readonly options: ViewerBrokerRedemptionOptions = {}) {}

    public async redeem(
        summary: VerifiedViewerCapsuleSummary,
        ticket: string,
        device: StoredViewerDeviceKeys,
    ): Promise<ViewerBrokerRedemptionResult> {
        const releaseEndpoint = brokerReleaseEndpoint(summary.broker);
        let claims: ViewerTicketClaimsV1;
        try {
            claims = await validateTicketClaims(ticket, summary, device, this.options.now);
        } catch {
            return { ok: false, code: 'invalid_ticket', retryable: false };
        }

        const fetchImplementation = this.options.fetch ?? fetch;
        const proofFactory = this.options.proofFactory ?? new KeyReleaseProofFactory();
        const openContentKey = this.options.openContentKey ?? openViewerContentKey;

        try {
            const proof = await proofFactory.createProof(releaseEndpoint, ticket, device);
            const response = await fetchImplementation(releaseEndpoint, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ticket,
                    proof,
                    agreement_public_key: device.agreementPublicKey.x,
                }),
                cache: 'no-store',
                credentials: 'omit',
                referrerPolicy: 'no-referrer',
            });
            if (response.status === 429) {
                return { ok: false, code: 'rate_limited', retryable: true };
            }

            let payload: unknown;
            try {
                payload = await response.json();
            } catch {
                return { ok: false, code: 'invalid_response', retryable: false };
            }
            if (!response.ok) {
                try {
                    const error = parseCtxError(payload);
                    return {
                        ok: false,
                        code: 'release_denied',
                        denialCode: error.code,
                        retryable: error.retryable,
                    };
                } catch {
                    return { ok: false, code: 'invalid_response', retryable: false };
                }
            }

            let envelope: ViewerKeyReleaseEnvelope;
            try {
                envelope = parseKeyReleaseEnvelope(payload);
            } catch {
                return { ok: false, code: 'invalid_response', retryable: false };
            }
            if (
                envelope.ticket_jti !== claims.jti ||
                envelope.cryptographic_suite !== claims.ctx.cryptographic_suite
            ) {
                return { ok: false, code: 'invalid_response', retryable: false };
            }

            let contentKey: Uint8Array;
            try {
                contentKey = await openContentKey(
                    decodeBase64Url(envelope.enc),
                    decodeBase64Url(envelope.ciphertext),
                    device,
                    claims,
                    ticket,
                );
            } catch {
                return { ok: false, code: 'unwrap_failed', retryable: false };
            }

            return { ok: true, contentKey, ticketJti: envelope.ticket_jti };
        } catch {
            return { ok: false, code: 'network_error', retryable: true };
        }
    }
}

export class KeyReleaseProofFactory {
    public constructor(
        private readonly cryptography: Pick<Crypto, 'randomUUID' | 'subtle'> = crypto,
        private readonly now: () => number = () => Date.now(),
    ) {}

    public async createProof(
        releaseEndpoint: string,
        ticket: string,
        device: StoredViewerDeviceKeys,
    ): Promise<string> {
        if (device.proofPublicKey.kty !== 'OKP' || device.proofPublicKey.crv !== 'Ed25519') {
            throw new Error('invalid_proof_key');
        }
        const encodedHeader = encodeJson({
            typ: 'ctx-key-release-proof+jwt',
            alg: 'EdDSA',
            jwk: device.proofPublicKey,
        });
        const encodedClaims = encodeJson({
            jti: this.cryptography.randomUUID(),
            htm: 'POST',
            htu: exactReleaseEndpoint(releaseEndpoint),
            iat: Math.floor(this.now() / 1000),
            tth: await sha256Base64Url(new TextEncoder().encode(ticket)),
        });
        const signingInput = `${encodedHeader}.${encodedClaims}`;
        const signature = await this.cryptography.subtle.sign(
            'Ed25519',
            device.proofPrivateKey,
            new TextEncoder().encode(signingInput),
        );

        return `${signingInput}.${encodeBase64Url(new Uint8Array(signature))}`;
    }
}

async function validateTicketClaims(
    ticket: string,
    summary: VerifiedViewerCapsuleSummary,
    device: StoredViewerDeviceKeys,
    now: (() => number) | undefined,
): Promise<ViewerTicketClaimsV1> {
    const claims = decodeTicketClaims(ticket);
    if (
        claims.iss !== summary.ctxIssuer ||
        claims.aud !== summary.broker ||
        claims.ctx.capsule_id !== summary.capsuleId ||
        claims.ctx.capsule_revision !== summary.capsuleRevision ||
        claims.ctx.policy_sha256 !== summary.policySha256 ||
        claims.ctx.payload_id !== summary.payloadId ||
        claims.ctx.release_handle !== summary.releaseHandle ||
        claims.ctx.action !== 'render' ||
        claims.ctx.cryptographic_suite !== 'ctx-capsule-v1' ||
        claims.ctx.proof_jkt !== (await okpJwkThumbprint(device.proofPublicKey)) ||
        claims.ctx.agreement_jkt !== (await okpJwkThumbprint(device.agreementPublicKey))
    ) {
        throw new Error('ticket_binding_mismatch');
    }
    if (!serviceIdentity(claims.iss) || !serviceIdentity(claims.aud)) {
        throw new Error('invalid_ticket_identity');
    }
    const current = Math.floor((now ?? (() => Date.now()))() / 1000);
    if (
        !Number.isSafeInteger(claims.iat) ||
        !Number.isSafeInteger(claims.nbf) ||
        !Number.isSafeInteger(claims.exp) ||
        claims.nbf > claims.iat ||
        claims.exp - claims.iat !== 60 ||
        current + 5 < claims.nbf ||
        current - 5 >= claims.exp
    ) {
        throw new Error('ticket_time_invalid');
    }

    return claims;
}

function decodeTicketClaims(ticket: string): ViewerTicketClaimsV1 {
    const parts = ticket.split('.');
    if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
        throw new Error('invalid_ticket');
    }
    const encodedClaims = parts[1];
    if (encodedClaims === undefined) throw new Error('invalid_ticket');
    const claims: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedClaims)));
    if (!isRecord(claims) || !isRecord(claims.ctx)) throw new Error('invalid_ticket_claims');

    return claims as unknown as ViewerTicketClaimsV1;
}

interface ViewerKeyReleaseEnvelope {
    readonly type: 'ctx-key-release';
    readonly version: 1;
    readonly ticket_jti: string;
    readonly cryptographic_suite: 'ctx-capsule-v1';
    readonly enc: string;
    readonly ciphertext: string;
}

function parseKeyReleaseEnvelope(value: unknown): ViewerKeyReleaseEnvelope {
    if (!isRecord(value)) throw new Error('invalid_key_release');
    const keys = Object.keys(value).sort();
    if (
        keys.join(',') !== 'ciphertext,cryptographic_suite,enc,ticket_jti,type,version' ||
        value.type !== 'ctx-key-release' ||
        value.version !== 1 ||
        value.cryptographic_suite !== 'ctx-capsule-v1' ||
        typeof value.ticket_jti !== 'string' ||
        !encodedLength(value.enc, 32) ||
        !encodedLength(value.ciphertext, 48)
    ) {
        throw new Error('invalid_key_release');
    }

    return value as unknown as ViewerKeyReleaseEnvelope;
}

function parseCtxError(value: unknown): {
    readonly code: ViewerBrokerReleaseDenialCode;
    readonly retryable: boolean;
} {
    if (
        !isRecord(value) ||
        value.type !== 'ctx-error' ||
        value.version !== 1 ||
        !isViewerBrokerReleaseDenialCode(value.code) ||
        typeof value.retryable !== 'boolean'
    ) {
        throw new Error('invalid_ctx_error');
    }

    return { code: value.code, retryable: value.retryable };
}

function isViewerBrokerReleaseDenialCode(value: unknown): value is ViewerBrokerReleaseDenialCode {
    return (
        typeof value === 'string' &&
        [
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
            'challenge_required',
            'unsupported_contract',
            'invalid_proof',
            'invalid_ticket',
            'ticket_expired',
            'ticket_replayed',
            'release_unavailable',
            'temporarily_unavailable',
        ].includes(value)
    );
}

function encodedLength(value: unknown, bytes: number): value is string {
    if (typeof value !== 'string') return false;
    try {
        const decoded = decodeBase64Url(value);

        return decoded.byteLength === bytes && encodeBase64Url(decoded) === value;
    } catch {
        return false;
    }
}

function brokerReleaseEndpoint(broker: string): string {
    const url = new URL(exactReleaseEndpoint(`${broker.replace(/\/$/, '')}/releases`));

    return url.toString();
}

function exactReleaseEndpoint(value: string): string {
    const url = new URL(value);
    if (
        !serviceIdentity(url.origin) ||
        url.pathname !== '/releases' ||
        url.username !== '' ||
        url.password !== '' ||
        url.search !== '' ||
        url.hash !== ''
    ) {
        throw new Error('invalid_release_endpoint');
    }

    return url.toString();
}

function serviceIdentity(value: string): boolean {
    try {
        const url = new URL(value);

        return (
            (url.protocol === 'https:' ||
                (url.protocol === 'http:' &&
                    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) &&
            url.username === '' &&
            url.password === '' &&
            (url.pathname === '' || url.pathname === '/') &&
            url.search === '' &&
            url.hash === ''
        );
    } catch {
        return false;
    }
}

function encodeJson(value: unknown): string {
    return encodeBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
