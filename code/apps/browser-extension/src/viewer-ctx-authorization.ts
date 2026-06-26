import { CAPSULE_SUITE_ID } from '@sharecapsules/capsule-core';

import { DpopProofFactory } from './dpop.js';
import type { OAuthTokenSet } from './oauth.js';
import type { VerifiedViewerCapsuleSummary } from './viewer-capsule-verifier.js';
import type { StoredViewerDeviceKeys } from './viewer-device.js';

export interface ViewerCtxAuthorizationTicket {
    readonly ticket: string;
    readonly expiresIn: number;
}

export type ViewerCtxAuthorizationFailureCode =
    | 'invalid_session'
    | 'invalid_response'
    | 'authorization_denied'
    | 'challenge_required'
    | 'rate_limited'
    | 'network_error';

export interface ViewerCtxChallengeAttempt {
    readonly attemptId: string;
    readonly challengeUrl: string;
    readonly expiresIn: number;
}

export type ViewerCtxAuthorizationResult =
    | {
          readonly ok: true;
          readonly authorization: ViewerCtxAuthorizationTicket;
      }
    | {
          readonly ok: false;
          readonly code: ViewerCtxAuthorizationFailureCode;
      };

export interface ViewerCtxAuthorizationOptions {
    readonly fetch?: typeof fetch;
    readonly dpop?: DpopProofFactory;
}

export class ViewerCtxAuthorizationClient {
    public constructor(
        private readonly authorizationEndpoint: string,
        private readonly options: ViewerCtxAuthorizationOptions = {},
    ) {}

    public async authorize(
        summary: VerifiedViewerCapsuleSummary,
        token: OAuthTokenSet,
        device: StoredViewerDeviceKeys,
        hostOrigin: string,
        viewEventConsent: boolean,
    ): Promise<ViewerCtxAuthorizationResult> {
        if (
            token.tokenType !== 'DPoP' ||
            !token.scopes.includes('ctx:authorize') ||
            token.scopes.includes('capsule:create')
        ) {
            return { ok: false, code: 'invalid_session' };
        }

        const fetchImplementation = this.options.fetch ?? fetch;
        const dpop = this.options.dpop ?? new DpopProofFactory();

        try {
            const proof = await dpop.createResourceProof(
                this.authorizationEndpoint,
                token.accessToken,
                device.proofPrivateKey,
                device.proofPublicKey,
            );
            const response = await fetchImplementation(this.authorizationEndpoint, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    Authorization: `DPoP ${token.accessToken}`,
                    'Content-Type': 'application/json',
                    DPoP: proof,
                },
                body: JSON.stringify(authorizationRequest(summary, hostOrigin, viewEventConsent)),
            });
            if (response.status === 429) {
                return { ok: false, code: 'rate_limited' };
            }

            const payload: unknown = await response.json();

            if (!response.ok) return authorizationFailure(payload);

            return { ok: true, authorization: parseAuthorizationResponse(payload) };
        } catch (error) {
            if (error instanceof ViewerCtxAuthorizationParseError) {
                return { ok: false, code: 'invalid_response' };
            }
            return { ok: false, code: 'network_error' };
        }
    }

    public async createChallengeAttempt(
        summary: VerifiedViewerCapsuleSummary,
        token: OAuthTokenSet,
        device: StoredViewerDeviceKeys,
        hostOrigin: string,
        returnTo: string,
    ): Promise<ViewerCtxChallengeAttempt> {
        const endpoint = new URL('/ctx/challenge-attempts', this.authorizationEndpoint).toString();
        const fetchImplementation = this.options.fetch ?? fetch;
        const dpop = this.options.dpop ?? new DpopProofFactory();
        const proof = await dpop.createResourceProof(
            endpoint,
            token.accessToken,
            device.proofPrivateKey,
            device.proofPublicKey,
        );
        const response = await fetchImplementation(endpoint, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                Authorization: `DPoP ${token.accessToken}`,
                'Content-Type': 'application/json',
                DPoP: proof,
            },
            body: JSON.stringify({
                ...challengeAttemptRequest(summary, hostOrigin),
                return_to: returnTo,
            }),
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
            throw new ViewerCtxAuthorizationParseError();
        }

        return parseChallengeAttemptResponse(payload);
    }
}

function authorizationRequest(
    summary: VerifiedViewerCapsuleSummary,
    hostOrigin: string,
    viewEventConsent: boolean,
): Record<string, unknown> {
    return {
        type: 'ctx-authorization-request',
        version: 1,
        broker: summary.broker,
        host_origin: hostOrigin,
        capsule_id: summary.capsuleId,
        capsule_revision: summary.capsuleRevision,
        policy: summary.policy,
        policy_sha256: summary.policySha256,
        payload_id: summary.payloadId,
        release_handle: summary.releaseHandle,
        action: 'render',
        cryptographic_suite: CAPSULE_SUITE_ID,
        view_event_consent: viewEventConsent,
    };
}

function challengeAttemptRequest(
    summary: VerifiedViewerCapsuleSummary,
    hostOrigin: string,
): Record<string, unknown> {
    return {
        type: 'ctx-challenge-attempt-request',
        version: 1,
        host_origin: hostOrigin,
        broker: summary.broker,
        capsule_id: summary.capsuleId,
        capsule_revision: summary.capsuleRevision,
        policy_sha256: summary.policySha256,
        payload_id: summary.payloadId,
        release_handle: summary.releaseHandle,
        action: 'render',
    };
}

function authorizationFailure(payload: unknown): ViewerCtxAuthorizationResult {
    if (
        typeof payload === 'object' &&
        payload !== null &&
        !Array.isArray(payload) &&
        (payload as Record<string, unknown>).type === 'ctx-error' &&
        (payload as Record<string, unknown>).version === 1 &&
        (payload as Record<string, unknown>).code === 'challenge_required'
    ) {
        return { ok: false, code: 'challenge_required' };
    }

    return { ok: false, code: 'authorization_denied' };
}

function parseAuthorizationResponse(value: unknown): ViewerCtxAuthorizationTicket {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new ViewerCtxAuthorizationParseError();
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    if (
        keys.join(',') !== 'expires_in,ticket,type,version' ||
        record.type !== 'ctx-authorization' ||
        record.version !== 1 ||
        typeof record.ticket !== 'string' ||
        record.ticket.split('.').length !== 3 ||
        typeof record.expires_in !== 'number' ||
        !Number.isSafeInteger(record.expires_in) ||
        record.expires_in < 1 ||
        record.expires_in > 120
    ) {
        throw new ViewerCtxAuthorizationParseError();
    }

    return Object.freeze({ ticket: record.ticket, expiresIn: record.expires_in });
}

function parseChallengeAttemptResponse(value: unknown): ViewerCtxChallengeAttempt {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new ViewerCtxAuthorizationParseError();
    }
    const record = value as Record<string, unknown>;
    if (
        record.type !== 'ctx-challenge-attempt' ||
        record.version !== 1 ||
        typeof record.attempt_id !== 'string' ||
        typeof record.challenge_url !== 'string' ||
        typeof record.expires_in !== 'number' ||
        !Number.isSafeInteger(record.expires_in) ||
        record.expires_in < 1
    ) {
        throw new ViewerCtxAuthorizationParseError();
    }

    return Object.freeze({
        attemptId: record.attempt_id,
        challengeUrl: record.challenge_url,
        expiresIn: record.expires_in,
    });
}

class ViewerCtxAuthorizationParseError extends Error {}
