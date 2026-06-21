<?php

namespace App\Ctx\Tickets;

interface TicketIdentifierSource
{
    public function identifier(): string;
}
