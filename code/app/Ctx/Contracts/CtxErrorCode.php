<?php

namespace App\Ctx\Contracts;

enum CtxErrorCode: string
{
    case InvalidRequest = 'invalid_request';
    case AuthenticationRequired = 'authentication_required';
    case EmailVerificationRequired = 'email_verification_required';
    case AccountUnavailable = 'account_unavailable';
    case DeviceRegistrationRequired = 'device_registration_required';
    case ConsentRequired = 'consent_required';
    case PolicyUnsatisfied = 'policy_unsatisfied';
    case CapsuleLimitReached = 'capsule_limit_reached';
    case AccountCapsuleLimitReached = 'account_capsule_limit_reached';
    case AutomationRiskHigh = 'automation_risk_high';
    case UnsupportedContract = 'unsupported_contract';
    case InvalidProof = 'invalid_proof';
    case InvalidTicket = 'invalid_ticket';
    case TicketExpired = 'ticket_expired';
    case TicketReplayed = 'ticket_replayed';
    case ReleaseUnavailable = 'release_unavailable';
    case TemporarilyUnavailable = 'temporarily_unavailable';
}
