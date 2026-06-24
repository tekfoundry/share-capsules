import type { ViewerCapsuleFetchFailureCode } from './viewer-capsule-fetcher.js';
import type { ViewerCtxAuthorizationFailureCode } from './viewer-ctx-authorization.js';
import type { ViewerBrokerRedemptionResult } from './viewer-broker-redemption.js';

export function viewerFetchFailureMessage(code: ViewerCapsuleFetchFailureCode): string {
    if (code === 'network_error' || code === 'unexpected_status') {
        return 'This Capsule could not be reached. Check the connection, then try again.';
    }
    if (code === 'too_large') {
        return 'This Capsule is larger than this Viewer can safely open.';
    }
    if (code === 'empty_body') {
        return 'This Capsule file is empty. The protected content remains locked.';
    }

    return 'This Capsule could not be fetched safely. The protected content remains locked.';
}

export function viewerFetchFailureIsRetryable(code: ViewerCapsuleFetchFailureCode): boolean {
    return code === 'network_error' || code === 'unexpected_status';
}

export function viewerAuthorizationFailureMessage(code: ViewerCtxAuthorizationFailureCode): string {
    if (code === 'network_error') {
        return 'Share Capsules could not be reached for authorization. Check the connection, then try again.';
    }
    if (code === 'invalid_session') {
        return 'This viewer session could not be verified. Reconnect your Share Capsules account and try again.';
    }
    if (code === 'invalid_response') {
        return 'Share Capsules returned an unexpected authorization response. The protected content remains locked.';
    }

    return 'Authorization was not approved. The protected content remains locked.';
}

export function viewerAuthorizationFailureIsRetryable(
    code: ViewerCtxAuthorizationFailureCode,
): boolean {
    return code === 'network_error';
}

export function brokerRedemptionFailureMessage(
    redemption: Extract<ViewerBrokerRedemptionResult, { readonly ok: false }>,
): string {
    if (redemption.code === 'rate_limited') {
        return 'Opening is temporarily limited because too many Capsules were requested at once. Wait a moment, then try again.';
    }
    if (redemption.code === 'invalid_ticket' || redemption.denialCode === 'invalid_ticket') {
        return 'This opening request could not be verified. Refresh the page and try again.';
    }
    if (redemption.denialCode === 'invalid_proof') {
        return 'This viewer session could not be verified. Reconnect your Share Capsules account and try again.';
    }
    if (redemption.denialCode === 'ticket_expired' || redemption.denialCode === 'ticket_replayed') {
        return 'This opening request is no longer fresh. Refresh the page and try again.';
    }
    if (redemption.denialCode === 'release_unavailable') {
        return 'This Capsule is no longer available to open.';
    }
    if (redemption.denialCode === 'capsule_limit_reached') {
        return 'This Capsule has reached its total opening limit.';
    }
    if (redemption.denialCode === 'account_capsule_limit_reached') {
        return 'Your account has reached its opening limit for this Capsule.';
    }
    if (redemption.denialCode === 'account_unavailable') {
        return 'Your Share Capsules account is not currently allowed to open this Capsule.';
    }
    if (redemption.denialCode === 'device_registration_required') {
        return 'This browser is not registered for viewing. Reconnect your Share Capsules account and try again.';
    }
    if (redemption.denialCode === 'policy_unsatisfied') {
        return 'This Capsule cannot be opened right now because its access rules are not satisfied.';
    }
    if (redemption.denialCode === 'automation_risk_high') {
        return 'This Capsule cannot be opened because automated viewing protection was triggered.';
    }
    if (brokerRedemptionFailureIsRetryable(redemption)) {
        return 'The key service is temporarily unavailable. Wait a moment, then try again.';
    }

    return 'This Capsule could not be opened safely. The protected content remains locked.';
}

export function brokerRedemptionFailureIsRetryable(
    redemption: Extract<ViewerBrokerRedemptionResult, { readonly ok: false }>,
): boolean {
    return (
        redemption.code === 'rate_limited' ||
        redemption.code === 'network_error' ||
        redemption.retryable ||
        redemption.denialCode === 'temporarily_unavailable'
    );
}
