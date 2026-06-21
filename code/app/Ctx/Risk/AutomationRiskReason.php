<?php

namespace App\Ctx\Risk;

enum AutomationRiskReason: string
{
    case None = 'none';
    case AuthorizationVelocity = 'authorization_velocity';
    case CommittedReleaseVelocity = 'committed_release_velocity';
    case CapsuleSpread = 'capsule_spread';
    case TicketMisuse = 'ticket_misuse';
    case PendingTicketConcurrency = 'pending_ticket_concurrency';
}
