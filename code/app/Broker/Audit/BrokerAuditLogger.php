<?php

namespace App\Broker\Audit;

use Illuminate\Support\Facades\Log;

final class BrokerAuditLogger implements BrokerAuditSink
{
    /** @param array<string, bool|int|string|null> $context */
    public function record(string $event, array $context = []): void
    {
        Log::channel((string) config('sharecapsules.broker.audit_channel'))
            ->notice($event, $context);
    }
}
