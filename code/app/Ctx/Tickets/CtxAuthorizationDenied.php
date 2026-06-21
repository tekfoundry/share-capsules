<?php

namespace App\Ctx\Tickets;

use App\Ctx\Policy\PolicyDecisionCode;
use RuntimeException;

final class CtxAuthorizationDenied extends RuntimeException
{
    public function __construct(public readonly PolicyDecisionCode $reason)
    {
        parent::__construct($reason->value);
    }
}
