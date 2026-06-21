<?php

namespace App\Broker\Release;

interface TicketRedemptionClient
{
    public function redeem(string $jti, string $ticketSha256): TicketRedemptionOutcome;
}
