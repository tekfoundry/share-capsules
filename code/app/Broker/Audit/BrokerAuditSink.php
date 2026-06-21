<?php

namespace App\Broker\Audit;

interface BrokerAuditSink
{
    /** @param array<string, bool|int|string|null> $context */
    public function record(string $event, array $context = []): void;
}
