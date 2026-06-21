<?php

namespace App\Broker\Registration;

use Carbon\CarbonImmutable;
use SensitiveParameter;

final readonly class IssuedRegistrationGrant
{
    public function __construct(
        #[SensitiveParameter] public string $token,
        public CarbonImmutable $expiresAt,
    ) {}
}
