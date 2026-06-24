import { describe, expect, it } from 'vitest';

import {
    brokerRedemptionFailureIsRetryable,
    brokerRedemptionFailureMessage,
    viewerAuthorizationFailureIsRetryable,
    viewerAuthorizationFailureMessage,
    viewerFetchFailureIsRetryable,
    viewerFetchFailureMessage,
} from './viewer-blocker-state.js';

describe('Viewer blocker states', () => {
    it('treats transient Capsule fetch failures as retryable without over-sharing details', () => {
        expect(viewerFetchFailureIsRetryable('network_error')).toBe(true);
        expect(viewerFetchFailureMessage('network_error')).toBe(
            'This Capsule could not be reached. Check the connection, then try again.',
        );
        expect(viewerFetchFailureIsRetryable('unexpected_status')).toBe(true);
        expect(viewerFetchFailureIsRetryable('too_large')).toBe(false);
        expect(viewerFetchFailureMessage('too_large')).toBe(
            'This Capsule is larger than this Viewer can safely open.',
        );
    });

    it('keeps authorization retry available only for temporary connection failures', () => {
        expect(viewerAuthorizationFailureIsRetryable('network_error')).toBe(true);
        expect(viewerAuthorizationFailureMessage('network_error')).toBe(
            'Share Capsules could not be reached for authorization. Check the connection, then try again.',
        );
        expect(viewerAuthorizationFailureIsRetryable('authorization_denied')).toBe(false);
        expect(viewerAuthorizationFailureMessage('authorization_denied')).toBe(
            'Authorization was not approved. The protected content remains locked.',
        );
        expect(viewerAuthorizationFailureIsRetryable('invalid_session')).toBe(false);
    });

    it('shows retry for broker rate limits and temporary availability failures', () => {
        expect(
            brokerRedemptionFailureIsRetryable({
                ok: false,
                code: 'rate_limited',
                retryable: true,
            }),
        ).toBe(true);
        expect(
            brokerRedemptionFailureMessage({
                ok: false,
                code: 'rate_limited',
                retryable: true,
            }),
        ).toBe(
            'Opening is temporarily limited because too many Capsules were requested at once. Wait a moment, then try again.',
        );
        expect(
            brokerRedemptionFailureIsRetryable({
                ok: false,
                code: 'release_denied',
                denialCode: 'temporarily_unavailable',
                retryable: true,
            }),
        ).toBe(true);
    });

    it('does not retry permanent broker policy or limit failures', () => {
        expect(
            brokerRedemptionFailureIsRetryable({
                ok: false,
                code: 'release_denied',
                denialCode: 'capsule_limit_reached',
                retryable: false,
            }),
        ).toBe(false);
        expect(
            brokerRedemptionFailureMessage({
                ok: false,
                code: 'release_denied',
                denialCode: 'capsule_limit_reached',
                retryable: false,
            }),
        ).toBe('This Capsule has reached its total opening limit.');
        expect(
            brokerRedemptionFailureIsRetryable({
                ok: false,
                code: 'invalid_ticket',
                retryable: false,
            }),
        ).toBe(false);
    });

    it('uses safe human-readable messages for account, device, policy, and revocation blockers', () => {
        expect(
            brokerRedemptionFailureMessage({
                ok: false,
                code: 'release_denied',
                denialCode: 'release_unavailable',
                retryable: false,
            }),
        ).toBe('This Capsule is no longer available to open.');
        expect(
            brokerRedemptionFailureMessage({
                ok: false,
                code: 'release_denied',
                denialCode: 'account_capsule_limit_reached',
                retryable: false,
            }),
        ).toBe('Your account has reached its opening limit for this Capsule.');
        expect(
            brokerRedemptionFailureMessage({
                ok: false,
                code: 'release_denied',
                denialCode: 'account_unavailable',
                retryable: false,
            }),
        ).toBe('Your Share Capsules account is not currently allowed to open this Capsule.');
        expect(
            brokerRedemptionFailureMessage({
                ok: false,
                code: 'release_denied',
                denialCode: 'device_registration_required',
                retryable: false,
            }),
        ).toBe(
            'This browser is not registered for viewing. Reconnect your Share Capsules account and try again.',
        );
        expect(
            brokerRedemptionFailureMessage({
                ok: false,
                code: 'release_denied',
                denialCode: 'policy_unsatisfied',
                retryable: false,
            }),
        ).toBe(
            'This Capsule cannot be opened right now because its access rules are not satisfied.',
        );
        expect(
            brokerRedemptionFailureMessage({
                ok: false,
                code: 'release_denied',
                denialCode: 'automation_risk_high',
                retryable: false,
            }),
        ).toBe('This Capsule cannot be opened because automated viewing protection was triggered.');
    });
});
