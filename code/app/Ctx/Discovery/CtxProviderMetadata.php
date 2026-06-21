<?php

namespace App\Ctx\Discovery;

use App\Ctx\Contracts\CtxV1;
use App\Ctx\Contracts\ServiceIdentity;

final class CtxProviderMetadata
{
    /** @return array<string, string|list<string>> */
    public function toArray(): array
    {
        $issuer = ServiceIdentity::fromString((string) config('sharecapsules.ctx.issuer'));

        return [
            'issuer' => $issuer->value,
            'protocol_versions_supported' => [CtxV1::PROTOCOL_VERSION],
            'authorization_endpoint' => $issuer->endpoint('/ctx/authorize'),
            'ticket_redemption_endpoint' => $issuer->endpoint('/ctx/tickets/redeem'),
            'jwks_uri' => $issuer->endpoint('/ctx/jwks.json'),
            'ticket_types_supported' => [CtxV1::TICKET_TYPE],
            'ticket_signing_alg_values_supported' => [CtxV1::SIGNING_ALGORITHM],
            'dpop_signing_alg_values_supported' => [CtxV1::SIGNING_ALGORITHM],
        ];
    }
}
