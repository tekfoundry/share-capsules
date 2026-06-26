import { parseCtxErrorV1, type CtxErrorCodeV1, type CtxErrorV1 } from '@sharecapsules/ctx-client';

export type ViewerDenialCategory =
    | 'account'
    | 'availability'
    | 'consent'
    | 'device'
    | 'limit'
    | 'policy'
    | 'request'
    | 'risk'
    | 'ticket'
    | 'unsupported';

export type ViewerDenialAction =
    | 'complete_challenge'
    | 'connect_account'
    | 'manage_account'
    | 'none'
    | 'register_device'
    | 'retry_later'
    | 'review_consent'
    | 'start_fresh'
    | 'update_viewer'
    | 'verify_email';

export interface ViewerDenialPresentation {
    readonly protocolCode: CtxErrorCodeV1;
    readonly category: ViewerDenialCategory;
    readonly title: string;
    readonly explanation: string;
    readonly action: ViewerDenialAction;
    readonly canRetryLater: boolean;
}

export type HostCapsuleLifecycleState = 'locked' | 'unavailable' | 'unsupported';

type ReviewedExplanation = Omit<ViewerDenialPresentation, 'protocolCode' | 'canRetryLater'>;

const explanations = {
    invalid_request: {
        category: 'request',
        title: 'Access request not accepted',
        explanation: 'The Viewer could not create a valid access request for this Capsule.',
        action: 'none',
    },
    authentication_required: {
        category: 'account',
        title: 'Connect your account',
        explanation: 'Connect a Share Capsules account in the Viewer to check access.',
        action: 'connect_account',
    },
    email_verification_required: {
        category: 'account',
        title: 'Verify your email',
        explanation: 'Verify the email address on your connected account before trying again.',
        action: 'verify_email',
    },
    account_unavailable: {
        category: 'account',
        title: 'Account unavailable',
        explanation: 'Your connected account cannot authorize this access right now.',
        action: 'manage_account',
    },
    device_registration_required: {
        category: 'device',
        title: 'Register this Viewer',
        explanation: 'Register or reactivate this Viewer installation before trying again.',
        action: 'register_device',
    },
    consent_required: {
        category: 'consent',
        title: 'Review access disclosure',
        explanation: 'Review and approve the required Capsule access disclosure to continue.',
        action: 'review_consent',
    },
    policy_unsatisfied: {
        category: 'policy',
        title: 'Access requirements not met',
        explanation:
            'The current account evidence does not satisfy every requirement for this Capsule.',
        action: 'none',
    },
    capsule_limit_reached: {
        category: 'limit',
        title: 'Capsule access limit reached',
        explanation: 'This Capsule has reached the total release limit selected by its creator.',
        action: 'none',
    },
    account_capsule_limit_reached: {
        category: 'limit',
        title: 'Account access limit reached',
        explanation: 'Your account has reached this Capsule’s release limit.',
        action: 'none',
    },
    automation_risk_high: {
        category: 'risk',
        title: 'Access paused for activity review',
        explanation:
            'Recent protected-content activity matches a high-confidence automation pattern. No human-identity judgment is being made.',
        action: 'retry_later',
    },
    challenge_required: {
        category: 'risk',
        title: 'Quick check required',
        explanation:
            'This Capsule needs a short access-confidence check before the Viewer can continue. No personhood or identity judgment is being made.',
        action: 'complete_challenge',
    },
    unsupported_contract: {
        category: 'unsupported',
        title: 'Unsupported Capsule requirements',
        explanation: 'This Viewer does not support every required Capsule or CTX capability.',
        action: 'update_viewer',
    },
    invalid_proof: {
        category: 'device',
        title: 'Viewer proof not accepted',
        explanation:
            'The registered Viewer proof could not be verified. Start a fresh access request.',
        action: 'start_fresh',
    },
    invalid_ticket: {
        category: 'ticket',
        title: 'Access ticket not accepted',
        explanation:
            'The key broker could not verify this access ticket. Start a fresh access request.',
        action: 'start_fresh',
    },
    ticket_expired: {
        category: 'ticket',
        title: 'Access ticket expired',
        explanation: 'The short-lived access ticket expired. Start a fresh access request.',
        action: 'start_fresh',
    },
    ticket_replayed: {
        category: 'ticket',
        title: 'Access ticket already used',
        explanation:
            'This single-use access ticket cannot be used again. Start a fresh access request.',
        action: 'start_fresh',
    },
    release_unavailable: {
        category: 'availability',
        title: 'Capsule release unavailable',
        explanation: 'The key broker cannot release this Capsule key.',
        action: 'none',
    },
    temporarily_unavailable: {
        category: 'availability',
        title: 'Service temporarily unavailable',
        explanation: 'The CTX provider or key broker is temporarily unavailable. Try again later.',
        action: 'retry_later',
    },
} as const satisfies Record<CtxErrorCodeV1, ReviewedExplanation>;

export function viewerDenialFromResponse(value: unknown): ViewerDenialPresentation {
    return viewerDenial(parseCtxErrorV1(value));
}

export function viewerDenial(error: CtxErrorV1): ViewerDenialPresentation {
    return {
        protocolCode: error.code,
        ...explanations[error.code],
        canRetryLater: error.retryable,
    };
}

export function hostLifecycleState(
    denial: ViewerDenialPresentation,
): Readonly<{ state: HostCapsuleLifecycleState }> {
    if (denial.category === 'unsupported') return { state: 'unsupported' };
    if (denial.category === 'availability') return { state: 'unavailable' };

    return { state: 'locked' };
}
