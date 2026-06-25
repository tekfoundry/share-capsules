<?php

namespace App\Ctx\Tickets;

enum TicketRedemptionCode: string
{
    case Committed = 'committed';
    case AlreadyCommitted = 'already_committed';
    case Invalid = 'invalid_ticket';
    case Expired = 'ticket_expired';
    case Replayed = 'ticket_replayed';
    case AccountUnavailable = 'account_unavailable';
    case DeviceUnavailable = 'device_registration_required';
    case CapsuleLimitReached = 'capsule_limit_reached';
    case AccountCapsuleLimitReached = 'account_capsule_limit_reached';
    case AutomationRiskHigh = 'automation_risk_high';
    case PolicyUnsatisfied = 'policy_unsatisfied';
}
