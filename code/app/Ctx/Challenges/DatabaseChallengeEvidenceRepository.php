<?php

namespace App\Ctx\Challenges;

use App\Ctx\Trust\TrustScore;
use App\Models\CtxChallengeCadence;
use App\Models\User;
use App\Models\ViewerDevice;
use Carbon\CarbonImmutable;

final class DatabaseChallengeEvidenceRepository implements ChallengeEvidenceRepository
{
    public function currentFor(
        User $user,
        ViewerDevice $device,
        ChallengeAttemptContext $context,
        ?CarbonImmutable $now = null,
    ): ?CurrentChallengeEvidence {
        $now ??= CarbonImmutable::now();

        $cadence = CtxChallengeCadence::query()
            ->where('scope_sha256', CtxChallengeCadence::scopeKey($user, $device, $context))
            ->where('challenge_expires_at', '>', $now)
            ->where('last_challenge_score', '>=', ChallengeAttemptOrchestrator::PASSING_SCORE)
            ->first();

        if (! $cadence instanceof CtxChallengeCadence
            || $cadence->last_challenged_at === null
            || $cadence->challenge_expires_at === null
            || $cadence->last_challenge_score === null) {
            return null;
        }

        return new CurrentChallengeEvidence(
            score: TrustScore::fromInt((int) $cadence->last_challenge_score),
            lastChallengedAt: $cadence->last_challenged_at,
            expiresAt: $cadence->challenge_expires_at,
        );
    }

    public function resetFor(
        User $user,
        ViewerDevice $device,
        ChallengeAttemptContext $context,
        string $reason,
        ?CarbonImmutable $now = null,
    ): void {
        $now ??= CarbonImmutable::now();

        CtxChallengeCadence::query()
            ->where('scope_sha256', CtxChallengeCadence::scopeKey($user, $device, $context))
            ->update([
                'challenge_success_streak' => 0,
                'challenge_refresh_tier' => ChallengeAttemptOrchestrator::CADENCE_TIER_STANDARD,
                'challenge_expires_at' => $now,
                'last_reset_reason' => $reason,
                'updated_at' => $now,
            ]);
    }
}
