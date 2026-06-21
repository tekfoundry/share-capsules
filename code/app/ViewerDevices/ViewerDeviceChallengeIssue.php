<?php

namespace App\ViewerDevices;

use DateTimeInterface;

final readonly class ViewerDeviceChallengeIssue
{
    public function __construct(
        public string $id,
        public string $nonce,
        public string $serverAgreementPublicKey,
        public DateTimeInterface $expiresAt,
    ) {}
}
