<?php

namespace App\Showcase;

use App\Broker\Keys\ContentKey;
use App\Broker\Registration\ContentKeyRegistrar;
use App\Broker\Registration\RegisteredContentKey;

final readonly class BrokerShowcaseContentKeyRegistration implements ShowcaseContentKeyRegistration
{
    public function __construct(private ContentKeyRegistrar $registrar) {}

    public function register(
        string $grant,
        string $registrationId,
        string $capsuleId,
        string $payloadId,
        string $contentKeyBytes,
    ): RegisteredContentKey {
        $contentKey = ContentKey::fromBytes($contentKeyBytes);

        return $this->registrar->register($grant, $registrationId, $capsuleId, $payloadId, $contentKey);
    }
}
