<?php

namespace App\Ctx\SigningKeys;

final readonly class GeneratedTicketSigningKey
{
    public function __construct(
        public string $publicKey,
        public string $privateKey,
    ) {}
}
