<?php

namespace Tests\Unit\Ctx;

use App\Ctx\Policy\AutomationRiskDecision;
use App\Ctx\Policy\AutomationRiskEvaluator;
use App\Ctx\Policy\CommittedReleaseCounter;
use App\Ctx\Policy\CtxPolicyV1;
use App\Ctx\Policy\PolicyDecisionCode;
use App\Ctx\Policy\PreliminaryPolicyEvaluator;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
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

    private function evaluator(
        int $capsule = 0,
        int $account = 0,
        AutomationRiskDecision $risk = AutomationRiskDecision::NotHigh,
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
        $automation = new class($risk) implements AutomationRiskEvaluator
        {
            public function __construct(private readonly AutomationRiskDecision $decision) {}

            public function evaluate(User $user, string $issuer): AutomationRiskDecision
            {
                return $this->decision;
            }
        };

        return new PreliminaryPolicyEvaluator($counters, $automation);
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

    private function policy(?int $capsule = null, ?int $account = null, ?string $riskIssuer = null): CtxPolicyV1
    {
        $requirements = [
            ['predicate' => 'ctx.account.email-verified', 'equals' => true],
            ['predicate' => 'ctx.account.active', 'equals' => true],
            ['predicate' => 'ctx.viewer.device-registered', 'equals' => true],
            ['predicate' => 'ctx.consent.capsule-view-event', 'equals' => true],
        ];
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
