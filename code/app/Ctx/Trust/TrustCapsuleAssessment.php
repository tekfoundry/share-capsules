<?php

namespace App\Ctx\Trust;

use Carbon\CarbonImmutable;

final readonly class TrustCapsuleAssessment
{
    public function __construct(
        public TrustScore $usageScore,
        public UsageConfidence $usageConfidence,
        public TrustScore $challengeScore,
        public ?CarbonImmutable $lastChallengedAt,
        public ?CarbonImmutable $challengeExpiresAt,
        public TrustScore $finalTrustScore,
        public TrustCapsuleOutcome $finalOutcome,
    ) {}

    public function hasCurrentChallenge(?CarbonImmutable $now = null): bool
    {
        $now ??= CarbonImmutable::now();

        return $this->lastChallengedAt !== null
            && $this->challengeExpiresAt !== null
            && $this->challengeExpiresAt->greaterThan($now);
    }
}
