<?php

namespace Tests\Unit\Ctx;

use App\Ctx\Challenges\ChallengeAttemptContext;
use App\Ctx\Challenges\ChallengeEvidenceRepository;
use App\Ctx\Challenges\CurrentChallengeEvidence;
use App\Ctx\Policy\AutomationRiskDecision;
use App\Ctx\Policy\AutomationRiskEvaluator;
use App\Ctx\Policy\AutomationUsageAssessment;
use App\Ctx\Policy\CommittedReleaseCounter;
use App\Ctx\Policy\CtxPolicyV1;
use App\Ctx\Policy\PolicyDecisionCode;
use App\Ctx\Policy\PreliminaryPolicyEvaluator;
use App\Ctx\Risk\AutomationRiskReason;
use App\Ctx\Risk\V1AutomationRiskRules;
use App\Ctx\Trust\TrustCapsuleOutcomeCombiner;
use App\Ctx\Trust\TrustScore;
use App\Ctx\Trust\UsageConfidence;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class PreliminaryPolicyEvaluatorTest extends TestCase
{
    public function test_it_allows_current_evidence_below_each_creator_limit(): void
    {
        $decision = $this->evaluator(4, 2, AutomationRiskDecision::NotHigh)->evaluate(
            $this->policy(5, 3, 'https://trust.example'),
            $user = $this->user(),
            $this->device($user),
            'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            1,
            true,
        );

        $this->assertTrue($decision->allowed());
        $this->assertSame(PolicyDecisionCode::Allowed, $decision->code);
    }

    /** @param callable(User, ViewerDevice): void $change */
    #[DataProvider('mandatoryDenials')]
    public function test_it_returns_the_first_privacy_safe_mandatory_denial(
        PolicyDecisionCode $expected,
        bool $consent,
        callable $change,
    ): void {
        $user = $this->user();
        $device = $this->device($user);
        $change($user, $device);

        $decision = $this->evaluator()->evaluate(
            $this->policy(),
            $user,
            $device,
            'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            1,
            $consent,
        );

        $this->assertSame($expected, $decision->code);
    }

    /** @return iterable<string, array{PolicyDecisionCode, bool, callable(User, ViewerDevice): void}> */
    public static function mandatoryDenials(): iterable
    {
        yield 'email' => [PolicyDecisionCode::EmailVerificationRequired, true, function (User $user): void {
            $user->email_verified_at = null;
        }];
        yield 'account' => [PolicyDecisionCode::AccountUnavailable, true, function (User $user): void {
            $user->closed_at = now();
        }];
        yield 'device' => [PolicyDecisionCode::DeviceRegistrationRequired, true, function (User $user, ViewerDevice $device): void {
            $device->status = ViewerDeviceStatus::Suspended;
        }];
        yield 'consent' => [PolicyDecisionCode::ConsentRequired, false, function (): void {}];
    }

    public function test_limits_use_committed_releases_and_reject_at_the_exact_maximum(): void
    {
        $user = $this->user();
        $device = $this->device($user);
        $capsule = $this->evaluator(5, 0)->evaluate(
            $this->policy(5, 3),
            $user,
            $device,
            'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            1,
            true,
        );
        $account = $this->evaluator(4, 3)->evaluate(
            $this->policy(5, 3),
            $user,
            $device,
            'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            1,
            true,
        );

        $this->assertSame(PolicyDecisionCode::CapsuleLimitReached, $capsule->code);
        $this->assertSame(PolicyDecisionCode::AccountCapsuleLimitReached, $account->code);
    }

    public function test_access_window_uses_inclusive_start_and_exclusive_end_boundaries(): void
    {
        $user = $this->user();
        $device = $this->device($user);
        $policy = $this->policy(
            notBefore: '2026-07-01T05:00:00Z',
            notAfter: '2026-08-01T05:00:00Z',
        );
        $evaluate = fn (string $now): PolicyDecisionCode => $this->evaluator()->evaluate(
            $policy,
            $user,
            $device,
            'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            1,
            true,
            now: CarbonImmutable::parse($now),
        )->code;

        $this->assertSame(PolicyDecisionCode::PolicyUnsatisfied, $evaluate('2026-07-01T04:59:59Z'));
        $this->assertSame(PolicyDecisionCode::Allowed, $evaluate('2026-07-01T05:00:00Z'));
        $this->assertSame(PolicyDecisionCode::Allowed, $evaluate('2026-08-01T04:59:59Z'));
        $this->assertSame(PolicyDecisionCode::PolicyUnsatisfied, $evaluate('2026-08-01T05:00:00Z'));
    }

    public function test_optional_automation_risk_fails_closed_without_disclosing_history(): void
    {
        $user = $this->user();
        $device = $this->device($user);
        $high = $this->evaluator(risk: AutomationRiskDecision::High)->evaluate(
            $this->policy(riskIssuer: 'https://trust.example'),
            $user,
            $device,
            'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            1,
            true,
        );
        $unavailable = $this->evaluator(risk: AutomationRiskDecision::Unavailable)->evaluate(
            $this->policy(riskIssuer: 'https://trust.example'),
            $user,
            $device,
            'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            1,
            true,
        );

        $this->assertSame(PolicyDecisionCode::AutomationRiskHigh, $high->code);
        $this->assertSame(PolicyDecisionCode::PolicyUnsatisfied, $unavailable->code);
    }

    public function test_low_confidence_trust_capsule_access_requires_a_challenge(): void
    {
        $user = $this->user();
        $device = $this->device($user);

        $decision = $this->evaluator(
            risk: AutomationRiskDecision::NotHigh,
            usageScore: 100,
            usageConfidence: UsageConfidence::Zero,
        )->evaluate(
            $this->policy(riskIssuer: 'https://trust.example'),
            $user,
            $device,
            'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            1,
            true,
        );

        $this->assertSame(PolicyDecisionCode::ChallengeRequired, $decision->code);
    }

    public function test_current_passing_challenge_evidence_allows_low_confidence_trust_capsule_access(): void
    {
        $user = $this->user();
        $device = $this->device($user);
        $now = CarbonImmutable::parse('2026-06-25T12:00:00Z');

        $decision = $this->evaluator(
            risk: AutomationRiskDecision::NotHigh,
            usageScore: 100,
            usageConfidence: UsageConfidence::Zero,
            challengeEvidence: new CurrentChallengeEvidence(
                score: TrustScore::fromInt(80),
                lastChallengedAt: $now->subMinute(),
                expiresAt: $now->addMinutes(10),
            ),
        )->evaluate(
            $this->policy(riskIssuer: 'https://trust.example'),
            $user,
            $device,
            'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            1,
            true,
            $this->challengeContext(),
            $now,
        );

        $this->assertSame(PolicyDecisionCode::Allowed, $decision->code);
    }

    public function test_medium_or_high_confidence_trust_capsule_access_uses_the_scaled_score(): void
    {
        $user = $this->user();
        $device = $this->device($user);
        $policy = $this->policy(riskIssuer: 'https://trust.example');

        $allowed = $this->evaluator(
            risk: AutomationRiskDecision::NotHigh,
            usageScore: 70,
            usageConfidence: UsageConfidence::Medium,
        )->evaluate($policy, $user, $device, 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703', 1, true);
        $denied = $this->evaluator(
            risk: AutomationRiskDecision::NotHigh,
            usageScore: 69,
            usageConfidence: UsageConfidence::High,
        )->evaluate($policy, $user, $device, 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703', 1, true);

        $this->assertSame(PolicyDecisionCode::Allowed, $allowed->code);
        $this->assertSame(PolicyDecisionCode::PolicyUnsatisfied, $denied->code);
    }

    private function evaluator(
        int $capsule = 0,
        int $account = 0,
        AutomationRiskDecision $risk = AutomationRiskDecision::NotHigh,
        int $usageScore = 100,
        UsageConfidence $usageConfidence = UsageConfidence::High,
        ?CurrentChallengeEvidence $challengeEvidence = null,
    ): PreliminaryPolicyEvaluator {
        $counters = new class($capsule, $account) implements CommittedReleaseCounter
        {
            public function __construct(private readonly int $capsule, private readonly int $account) {}

            public function forCapsule(string $capsuleId, int $capsuleRevision): int
            {
                return $this->capsule;
            }

            public function forAccountAndCapsule(User $user, string $capsuleId, int $capsuleRevision): int
            {
                return $this->account;
            }
        };
        $automation = new class($risk, $usageScore, $usageConfidence) implements AutomationRiskEvaluator
        {
            public function __construct(
                private readonly AutomationRiskDecision $decision,
                private readonly int $usageScore,
                private readonly UsageConfidence $usageConfidence,
            ) {}

            public function evaluate(User $user, string $issuer): AutomationRiskDecision
            {
                return $this->decision;
            }

            public function assessUsage(User $user, string $issuer): AutomationUsageAssessment
            {
                $now = CarbonImmutable::now();

                return new AutomationUsageAssessment(
                    decision: $this->decision,
                    reason: $this->decision === AutomationRiskDecision::High
                        ? AutomationRiskReason::AuthorizationVelocity
                        : AutomationRiskReason::None,
                    usageScore: $this->decision === AutomationRiskDecision::High
                        ? TrustScore::zero()
                        : TrustScore::fromInt($this->usageScore),
                    usageConfidence: $this->decision === AutomationRiskDecision::Unavailable
                        ? UsageConfidence::Zero
                        : $this->usageConfidence,
                    ruleset: V1AutomationRiskRules::RULESET,
                    evaluatedAt: $now,
                    expiresAt: $now->addMinute(),
                );
            }
        };

        $challenges = new class($challengeEvidence) implements ChallengeEvidenceRepository
        {
            public function __construct(private readonly ?CurrentChallengeEvidence $evidence) {}

            public function currentFor(
                User $user,
                ViewerDevice $device,
                ChallengeAttemptContext $context,
                ?CarbonImmutable $now = null,
            ): ?CurrentChallengeEvidence {
                return $this->evidence;
            }

            public function resetFor(
                User $user,
                ViewerDevice $device,
                ChallengeAttemptContext $context,
                string $reason,
                ?CarbonImmutable $now = null,
            ): void {}
        };

        return new PreliminaryPolicyEvaluator($counters, $automation, new TrustCapsuleOutcomeCombiner, $challenges);
    }

    private function user(): User
    {
        return (new User)->forceFill([
            'id' => 42,
            'email_verified_at' => now(),
            'closed_at' => null,
        ]);
    }

    private function device(User $user): ViewerDevice
    {
        return (new ViewerDevice)->forceFill([
            'user_id' => $user->getKey(),
            'status' => ViewerDeviceStatus::Active,
        ]);
    }

    private function challengeContext(): ChallengeAttemptContext
    {
        return new ChallengeAttemptContext(
            hostOrigin: 'https://host.example.test',
            broker: 'https://broker.example.test',
            capsuleId: 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            capsuleRevision: 1,
            policySha256: str_repeat('a', 43),
            payloadId: 'primary-image',
            releaseHandle: 'opaque-release-handle-0001',
            action: 'render',
        );
    }

    private function policy(
        ?int $capsule = null,
        ?int $account = null,
        ?string $riskIssuer = null,
        ?string $notBefore = null,
        ?string $notAfter = null,
    ): CtxPolicyV1 {
        $requirements = [
            ['predicate' => 'ctx.account.email-verified', 'equals' => true],
            ['predicate' => 'ctx.account.active', 'equals' => true],
            ['predicate' => 'ctx.viewer.device-registered', 'equals' => true],
            ['predicate' => 'ctx.consent.capsule-view-event', 'equals' => true],
        ];
        if ($notBefore !== null || $notAfter !== null) {
            $requirements[] = array_filter([
                'predicate' => 'ctx.time.capsule-access-window',
                'not_before' => $notBefore,
                'not_after' => $notAfter,
            ], fn (mixed $value): bool => $value !== null);
        }
        if ($capsule !== null) {
            $requirements[] = ['predicate' => 'ctx.usage.capsule-lifetime-limit', 'scope' => 'capsule', 'maximum' => $capsule];
        }
        if ($account !== null) {
            $requirements[] = ['predicate' => 'ctx.usage.capsule-account-lifetime-limit', 'scope' => 'account-and-capsule', 'maximum' => $account];
        }
        if ($riskIssuer !== null) {
            $requirements[] = ['predicate' => 'ctx.risk.ecosystem-automation-not-high', 'issuer' => $riskIssuer];
        }

        return CtxPolicyV1::parse([
            'type' => 'ctx-policy',
            'version' => 1,
            'combiner' => 'all',
            'requirements' => $requirements,
        ]);
    }
}
