<?php

namespace App\Ctx\Challenges;

use App\Ctx\Trust\TrustScore;
use Carbon\CarbonImmutable;

final readonly class CurrentChallengeEvidence
{
    public function __construct(
        public TrustScore $score,
        public CarbonImmutable $lastChallengedAt,
        public CarbonImmutable $expiresAt,
    ) {}
}
