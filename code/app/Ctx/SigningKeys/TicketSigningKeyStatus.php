<?php

namespace App\Ctx\SigningKeys;

enum TicketSigningKeyStatus: string
{
    case Published = 'published';
    case Active = 'active';
    case Retiring = 'retiring';
    case Retired = 'retired';
    case Revoked = 'revoked';
}
