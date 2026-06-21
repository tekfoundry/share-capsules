<?php

namespace App\Ctx\SigningKeys;

interface TicketSigningKeyGenerator
{
    public function generate(): GeneratedTicketSigningKey;
}
