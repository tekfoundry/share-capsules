<?php

namespace App\Broker\Registration;

final readonly class RegistrationGrantPrincipal
{
    public function __construct(
        public string $creatorId,
        public int $capsuleRevision,
        public string $policySha256,
    ) {}
}
