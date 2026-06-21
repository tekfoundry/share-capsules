<?php

namespace App\Ctx\Tickets;

final class NativeTicketIdentifierSource implements TicketIdentifierSource
{
    public function identifier(): string
    {
        return sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }
}
