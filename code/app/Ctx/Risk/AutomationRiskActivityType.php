<?php

namespace App\Ctx\Risk;

enum AutomationRiskActivityType: string
{
    case AuthorizationAttempted = 'authorization_attempted';
    case RedemptionCommitted = 'redemption_committed';
    case TicketRejected = 'ticket_rejected';
}
