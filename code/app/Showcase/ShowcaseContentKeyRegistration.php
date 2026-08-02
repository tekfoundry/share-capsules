<?php

namespace App\Showcase;

use App\Broker\Registration\RegisteredContentKey;

interface ShowcaseContentKeyRegistration
{
    public function register(
        string $grant,
        string $registrationId,
        string $capsuleId,
        string $payloadId,
        string $contentKeyBytes,
    ): RegisteredContentKey;
}
