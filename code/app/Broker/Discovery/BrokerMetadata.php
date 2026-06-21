<?php

namespace App\Broker\Discovery;

use App\Ctx\Contracts\CtxV1;
use App\Ctx\Contracts\ServiceIdentity;

final class BrokerMetadata
{
    /** @return array<string, string|list<string>> */
    public function toArray(): array
    {
        $broker = ServiceIdentity::fromString((string) config('sharecapsules.broker.base_url'));

        return [
            'broker' => $broker->value,
            'protocol_versions_supported' => [CtxV1::PROTOCOL_VERSION],
            'key_release_endpoint' => $broker->endpoint('/releases'),
            'ticket_types_supported' => [CtxV1::TICKET_TYPE],
            'cryptographic_suites_supported' => [CtxV1::CRYPTOGRAPHIC_SUITE],
        ];
    }
}
