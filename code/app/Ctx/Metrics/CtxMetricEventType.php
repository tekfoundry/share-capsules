<?php

namespace App\Ctx\Metrics;

enum CtxMetricEventType: string
{
    case AuthorizationAttempted = 'authorization_attempted';
    case AuthorizationApproved = 'authorization_approved';
    case AuthorizationDenied = 'authorization_denied';
    case RedemptionCommitted = 'redemption_committed';
    case TicketRejected = 'ticket_rejected';
    case CapsuleRevoked = 'capsule_revoked';
    case ReleasePaused = 'release_paused';
}
