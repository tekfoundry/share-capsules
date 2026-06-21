<?php

namespace App\Broker\Release;

use App\Models\BrokerContentKey;

final readonly class ValidatedTicket
{
    /** @param array<string, int|string> $context */
    public function __construct(
        public string $compact,
        public string $jti,
        public string $proofJkt,
        public string $agreementJkt,
        public array $context,
        public BrokerContentKey $record,
    ) {}
}
