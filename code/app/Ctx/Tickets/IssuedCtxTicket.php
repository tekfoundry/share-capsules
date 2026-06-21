<?php

namespace App\Ctx\Tickets;

use Carbon\CarbonImmutable;
use SensitiveParameter;

final readonly class IssuedCtxTicket
{
    public function __construct(
        #[SensitiveParameter] public string $compact,
        public string $identifier,
        public CarbonImmutable $expiresAt,
    ) {}
}
