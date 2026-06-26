<?php

namespace Tests\Unit\Ctx;

use App\Ctx\Trust\TrustCapsuleOutcome;
use App\Ctx\Trust\TrustCapsuleOutcomeCombiner;
use App\Ctx\Trust\TrustScore;
use App\Ctx\Trust\UsageConfidence;
use Carbon\CarbonImmutable;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

final class TrustCapsuleOutcomeCombinerTest extends TestCase
{
    public function test_scores_are_bounded_zero_to_one_hundred(): void
    {
        $this->assertSame(0, TrustScore::zero()->value);
        $this->assertSame(100, TrustScore::perfect()->value);
        $this->assertSame(50, TrustScore::average(TrustScore::fromInt(0), TrustScore::fromInt(100))->value);

        $this->expectException(InvalidArgumentException::class);
        TrustScore::fromInt(101);
    }

    public function test_no_usage_data_defaults_to_clean_score_but_requires_a_challenge(): void
    {
        $assessment = (new TrustCapsuleOutcomeCombiner)->assess(
            usageScore: TrustScore::perfect(),
            usageConfidence: UsageConfidence::Zero,
            challengeScore: TrustScore::zero(),
            lastChallengedAt: null,
            challengeExpiresAt: null,
            now: CarbonImmutable::parse('2026-06-25T12:00:00Z'),
        );

        $this->assertSame(100, $assessment->usageScore->value);
        $this->assertSame(UsageConfidence::Zero, $assessment->usageConfidence);
        $this->assertSame(0, $assessment->challengeScore->value);
        $this->assertSame(100, $assessment->finalTrustScore->value);
        $this->assertSame(TrustCapsuleOutcome::ChallengeRequired, $assessment->finalOutcome);
    }

    public function test_current_passing_challenge_allows_low_confidence_clean_usage(): void
    {
        $now = CarbonImmutable::parse('2026-06-25T12:00:00Z');
        $assessment = (new TrustCapsuleOutcomeCombiner)->assess(
            usageScore: TrustScore::perfect(),
            usageConfidence: UsageConfidence::Low,
            challengeScore: TrustScore::fromInt(80),
            lastChallengedAt: $now->subMinute(),
            challengeExpiresAt: $now->addMinutes(5),
            now: $now,
        );

        $this->assertTrue($assessment->hasCurrentChallenge($now));
        $this->assertSame(90, $assessment->finalTrustScore->value);
        $this->assertSame(TrustCapsuleOutcome::Allow, $assessment->finalOutcome);
    }

    public function test_expired_or_low_challenge_requires_another_challenge(): void
    {
        $now = CarbonImmutable::parse('2026-06-25T12:00:00Z');
        $combiner = new TrustCapsuleOutcomeCombiner;

        $expired = $combiner->assess(
            usageScore: TrustScore::perfect(),
            usageConfidence: UsageConfidence::Low,
            challengeScore: TrustScore::fromInt(95),
            lastChallengedAt: $now->subMinutes(10),
            challengeExpiresAt: $now->subMinute(),
            now: $now,
        );
        $low = $combiner->assess(
            usageScore: TrustScore::perfect(),
            usageConfidence: UsageConfidence::Low,
            challengeScore: TrustScore::fromInt(69),
            lastChallengedAt: $now->subMinute(),
            challengeExpiresAt: $now->addMinutes(5),
            now: $now,
        );

        $this->assertFalse($expired->hasCurrentChallenge($now));
        $this->assertSame(TrustCapsuleOutcome::ChallengeRequired, $expired->finalOutcome);
        $this->assertSame(TrustCapsuleOutcome::ChallengeRequired, $low->finalOutcome);
    }

    public function test_active_severe_usage_risk_cannot_be_overridden_by_challenge_success(): void
    {
        $now = CarbonImmutable::parse('2026-06-25T12:00:00Z');
        $assessment = (new TrustCapsuleOutcomeCombiner)->assess(
            usageScore: TrustScore::zero(),
            usageConfidence: UsageConfidence::High,
            challengeScore: TrustScore::perfect(),
            lastChallengedAt: $now->subMinute(),
            challengeExpiresAt: $now->addMinutes(5),
            severeUsageRisk: true,
            now: $now,
        );

        $this->assertSame(50, $assessment->finalTrustScore->value);
        $this->assertSame(TrustCapsuleOutcome::Deny, $assessment->finalOutcome);
    }

    public function test_provider_unavailability_is_distinct_from_denial(): void
    {
        $assessment = (new TrustCapsuleOutcomeCombiner)->assess(
            usageScore: TrustScore::perfect(),
            usageConfidence: UsageConfidence::High,
            challengeScore: TrustScore::zero(),
            lastChallengedAt: null,
            challengeExpiresAt: null,
            temporarilyUnavailable: true,
            now: CarbonImmutable::parse('2026-06-25T12:00:00Z'),
        );

        $this->assertSame(TrustCapsuleOutcome::TemporarilyUnavailable, $assessment->finalOutcome);
    }
}
