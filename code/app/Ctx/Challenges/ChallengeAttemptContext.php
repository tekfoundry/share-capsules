<?php

namespace App\Ctx\Challenges;

final readonly class ChallengeAttemptContext
{
    public function __construct(
        public string $hostOrigin,
        public string $broker,
        public string $capsuleId,
        public int $capsuleRevision,
        public string $policySha256,
        public string $payloadId,
        public string $releaseHandle,
        public string $action,
    ) {}
}
