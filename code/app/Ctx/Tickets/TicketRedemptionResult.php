<?php

namespace App\Ctx\Tickets;

final readonly class TicketRedemptionResult
{
    public function __construct(public TicketRedemptionCode $code) {}

    public function committed(): bool
    {
        return in_array(
            $this->code,
            [TicketRedemptionCode::Committed, TicketRedemptionCode::AlreadyCommitted],
            true,
        );
    }
}
