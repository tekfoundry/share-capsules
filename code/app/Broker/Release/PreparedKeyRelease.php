<?php

namespace App\Broker\Release;

final readonly class PreparedKeyRelease
{
    public function __construct(
        public string $recordId,
        public string $ticketJti,
        public string $enc,
        public string $ciphertext,
    ) {}
}
