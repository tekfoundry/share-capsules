<?php

namespace App\Ctx\Trust;

use Carbon\CarbonImmutable;

final readonly class TrustCapsuleOutcomeCombiner
{
    public const DEFAULT_PASSING_SCORE = 70;

    public function assess(
        TrustScore $usageScore,
        UsageConfidence $usageConfidence,
        TrustScore $challengeScore,
        ?CarbonImmutable $lastChallengedAt,
        ?CarbonImmutable $challengeExpiresAt,
        bool $severeUsageRisk = false,
        bool $temporarilyUnavailable = false,
        ?CarbonImmutable $now = null,
    ): TrustCapsuleAssessment {
        $now ??= CarbonImmutable::now();
        $challengeCurrent = $lastChallengedAt !== null
            && $challengeExpiresAt !== null
            && $challengeExpiresAt->greaterThan($now);
        $finalScore = $challengeCurrent
            ? TrustScore::average($usageScore, $challengeScore)
            : $usageScore;

        if ($temporarilyUnavailable) {
            $outcome = TrustCapsuleOutcome::TemporarilyUnavailable;
        } elseif ($severeUsageRisk) {
            $outcome = TrustCapsuleOutcome::Deny;
        } elseif ($usageConfidence->requiresChallenge() && ! $challengeCurrent) {
            $outcome = TrustCapsuleOutcome::ChallengeRequired;
        } elseif ($usageConfidence->requiresChallenge() && $challengeScore->value < self::DEFAULT_PASSING_SCORE) {
            $outcome = TrustCapsuleOutcome::ChallengeRequired;
        } elseif ($finalScore->value >= self::DEFAULT_PASSING_SCORE) {
            $outcome = TrustCapsuleOutcome::Allow;
        } else {
            $outcome = TrustCapsuleOutcome::Deny;
        }

        return new TrustCapsuleAssessment(
            usageScore: $usageScore,
            usageConfidence: $usageConfidence,
            challengeScore: $challengeScore,
            lastChallengedAt: $lastChallengedAt,
            challengeExpiresAt: $challengeExpiresAt,
            finalTrustScore: $finalScore,
            finalOutcome: $outcome,
        );
    }
}
