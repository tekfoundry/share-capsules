<?php

namespace App\Broker\Keys;

use InvalidArgumentException;

final readonly class KeyProtectionContext
{
    public function __construct(public string $recordId)
    {
        if (preg_match('/\A[A-Za-z0-9_-]{16,128}\z/', $recordId) !== 1) {
            throw new InvalidArgumentException('The key-protection record identifier is invalid.');
        }
    }

    public function additionalAuthenticatedData(): string
    {
        return "share-capsules-broker-key-protection-v1\0".$this->recordId;
    }
}
