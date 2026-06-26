<?php

namespace Tests\Unit\Ctx;

use App\Ctx\Policy\AutomationRiskDecision;
use App\Ctx\Risk\AutomationRiskActivityType;
use App\Ctx\Risk\AutomationRiskReason;
use App\Ctx\Risk\V1AutomationRiskEvaluator;
use App\Ctx\Risk\V1AutomationRiskRules;
use App\Ctx\SigningKeys\TicketSigningKeyLifecycle;
use App\Ctx\Trust\UsageConfidence;
use App\Models\CtxAuthorizationTicket;
use App\Models\CtxAutomationRiskActivity;
use App\Models\CtxAutomationRiskAssessment;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

final class V1AutomationRiskEvaluatorTest extends TestCase
{
    use RefreshDatabase;

    private const ISSUER = 'https://provider.example.test';

    protected function setUp(): void
    {
        parent::setUp();
        $this->freezeTime();
        config()->set('sharecapsules.ctx.issuer', self::ISSUER);
    }

    public function test_assessment_is_current_versioned_and_unavailable_for_an_unaccepted_issuer(): void
    {
        [$user] = $this->identity();
        $evaluator = app(V1AutomationRiskEvaluator::class);

        $this->assertSame(AutomationRiskDecision::NotHigh, $evaluator->evaluate($user, self::ISSUER));
        $assessment = CtxAutomationRiskAssessment::query()->sole();
        $this->assertSame(self::ISSUER, $assessment->issuer);
        $this->assertSame(V1AutomationRiskRules::RULESET, $assessment->ruleset);
        $this->assertSame(AutomationRiskDecision::NotHigh, $assessment->decision);
        $this->assertSame(AutomationRiskReason::None, $assessment->reason);
        $this->assertSame(100, $assessment->usage_score);
        $this->assertSame(UsageConfidence::Zero, $assessment->usage_confidence);
        $this->assertTrue($assessment->evaluated_at->isSameSecond(now()));
        $this->assertTrue($assessment->expires_at->isSameSecond(now()->addSeconds(60)));

        $unavailable = $evaluator->assessUsage($user, 'https://unaccepted.example.test');
        $this->assertSame(AutomationRiskDecision::Unavailable, $unavailable->decision);
        $this->assertTrue($unavailable->unavailable());
        $this->assertSame(0, $unavailable->usageScore->value);
        $this->assertSame(UsageConfidence::Zero, $unavailable->usageConfidence);
        $this->assertDatabaseCount('ctx_automation_risk_assessments', 1);
    }

    public function test_usage_score_scales_by_worst_current_threshold_utilization(): void
    {
        [$user, $device] = $this->identity();
        $this->activities($user, $device, AutomationRiskActivityType::AuthorizationAttempted, 150);

        $assessment = app(V1AutomationRiskEvaluator::class)->assessUsage($user, self::ISSUER);

        $this->assertSame(AutomationRiskDecision::NotHigh, $assessment->decision);
        $this->assertSame(50, $assessment->usageScore->value);
        $this->assertSame(UsageConfidence::High, $assessment->usageConfidence);
        $this->assertFalse($assessment->severeUsageRisk());

        $stored = CtxAutomationRiskAssessment::query()->sole();
        $this->assertSame(50, $stored->usage_score);
        $this->assertSame(UsageConfidence::High, $stored->usage_confidence);
    }

    public function test_usage_confidence_reflects_current_evidence_volume(): void
    {
        [$lowUser, $lowDevice] = $this->identity('low-confidence@example.test');
        $this->activities($lowUser, $lowDevice, AutomationRiskActivityType::AuthorizationAttempted, 1);
        [$mediumUser, $mediumDevice] = $this->identity('medium-confidence@example.test');
        $this->activities($mediumUser, $mediumDevice, AutomationRiskActivityType::AuthorizationAttempted, 10);

        $evaluator = app(V1AutomationRiskEvaluator::class);

        $this->assertSame(UsageConfidence::Low, $evaluator->assessUsage($lowUser, self::ISSUER)->usageConfidence);
        $this->assertSame(UsageConfidence::Medium, $evaluator->assessUsage($mediumUser, self::ISSUER)->usageConfidence);
    }

    public function test_authorization_velocity_uses_the_exact_rolling_boundary_and_account_scope(): void
    {
        [$user, $device] = $this->identity();
        [$other, $otherDevice] = $this->identity('other@example.test');
        $this->activities($user, $device, AutomationRiskActivityType::AuthorizationAttempted, 299);
        $this->activities($other, $otherDevice, AutomationRiskActivityType::AuthorizationAttempted, 300);
        $this->activities($user, $device, AutomationRiskActivityType::AuthorizationAttempted, 1, now()->subSeconds(301));
        $evaluator = app(V1AutomationRiskEvaluator::class);

        $this->assertSame(AutomationRiskDecision::NotHigh, $evaluator->evaluate($user, self::ISSUER));
        $this->activities($user, $device, AutomationRiskActivityType::AuthorizationAttempted, 1);

        $this->assertSame(AutomationRiskDecision::High, $evaluator->evaluate($user, self::ISSUER));
        $stored = CtxAutomationRiskAssessment::query()
            ->where('user_id', $user->getKey())->sole();
        $this->assertSame(AutomationRiskReason::AuthorizationVelocity, $stored->reason);
        $this->assertSame(0, $stored->usage_score);
        $this->assertSame(UsageConfidence::High, $stored->usage_confidence);
    }

    public function test_committed_release_velocity_and_capsule_spread_are_independent_rules(): void
    {
        [$velocityUser, $velocityDevice] = $this->identity('velocity@example.test');
        $this->activities(
            $velocityUser,
            $velocityDevice,
            AutomationRiskActivityType::RedemptionCommitted,
            V1AutomationRiskRules::COMMITTED_RELEASE_LIMIT,
        );
        [$spreadUser, $spreadDevice] = $this->identity('spread@example.test');
        $this->activities(
            $spreadUser,
            $spreadDevice,
            AutomationRiskActivityType::RedemptionCommitted,
            V1AutomationRiskRules::DISTINCT_CAPSULE_LIMIT,
            distinctCapsules: true,
        );
        $evaluator = app(V1AutomationRiskEvaluator::class);

        $this->assertSame(AutomationRiskDecision::High, $evaluator->evaluate($velocityUser, self::ISSUER));
        $this->assertSame(AutomationRiskReason::CommittedReleaseVelocity, CtxAutomationRiskAssessment::query()
            ->where('user_id', $velocityUser->getKey())->sole()->reason);
        $this->assertSame(AutomationRiskDecision::High, $evaluator->evaluate($spreadUser, self::ISSUER));
        $this->assertSame(AutomationRiskReason::CapsuleSpread, CtxAutomationRiskAssessment::query()
            ->where('user_id', $spreadUser->getKey())->sole()->reason);
    }

    public function test_repeated_ticket_rejection_reaches_high_at_the_exact_threshold(): void
    {
        [$user, $device] = $this->identity();
        $this->activities(
            $user,
            $device,
            AutomationRiskActivityType::TicketRejected,
            V1AutomationRiskRules::TICKET_REJECTION_LIMIT - 1,
        );
        $evaluator = app(V1AutomationRiskEvaluator::class);
        $this->assertSame(AutomationRiskDecision::NotHigh, $evaluator->evaluate($user, self::ISSUER));

        $this->activities($user, $device, AutomationRiskActivityType::TicketRejected, 1);

        $this->assertSame(AutomationRiskDecision::High, $evaluator->evaluate($user, self::ISSUER));
        $this->assertSame(AutomationRiskReason::TicketMisuse, CtxAutomationRiskAssessment::query()->sole()->reason);
    }

    public function test_live_pending_ticket_concurrency_is_rechecked_without_counting_expired_tickets(): void
    {
        [$user, $device] = $this->identity();
        $kid = app(TicketSigningKeyLifecycle::class)->stage()->kid;
        $this->tickets($user, $device, $kid, V1AutomationRiskRules::PENDING_TICKET_LIMIT - 1);
        $this->tickets($user, $device, $kid, 1, expired: true, offset: 1000);
        $evaluator = app(V1AutomationRiskEvaluator::class);
        $this->assertSame(AutomationRiskDecision::NotHigh, $evaluator->evaluate($user, self::ISSUER));

        $this->tickets($user, $device, $kid, 1, offset: 2000);

        $this->assertSame(AutomationRiskDecision::High, $evaluator->evaluate($user, self::ISSUER));
        $this->assertSame(AutomationRiskReason::PendingTicketConcurrency, CtxAutomationRiskAssessment::query()->sole()->reason);
    }

    public function test_rolling_activity_expires_after_thirty_days_and_account_deletion_cascades_state(): void
    {
        [$user, $device] = $this->identity();
        $this->activities($user, $device, AutomationRiskActivityType::AuthorizationAttempted, 1, now()->subDays(30));
        app(V1AutomationRiskEvaluator::class)->evaluate($user, self::ISSUER);

        $this->artisan('model:prune', ['--model' => CtxAutomationRiskActivity::class])->assertSuccessful();
        $this->assertDatabaseCount('ctx_automation_risk_activities', 0);
        $this->assertDatabaseCount('ctx_automation_risk_assessments', 1);

        $this->travel(30)->days();
        $this->artisan('model:prune', ['--model' => CtxAutomationRiskAssessment::class])->assertSuccessful();
        $this->assertDatabaseCount('ctx_automation_risk_assessments', 0);
        app(V1AutomationRiskEvaluator::class)->evaluate($user, self::ISSUER);

        $user->delete();
        $this->assertDatabaseCount('ctx_automation_risk_assessments', 0);
    }

    public function test_risk_state_contains_only_the_reviewed_ctx_metadata(): void
    {
        $this->assertEqualsCanonicalizing([
            'event_id',
            'user_id',
            'viewer_device_id',
            'activity_type',
            'capsule_id',
            'capsule_revision',
            'occurred_at',
            'created_at',
            'updated_at',
        ], Schema::getColumnListing('ctx_automation_risk_activities'));
        $columns = Schema::getColumnListing('ctx_automation_risk_activities');
        foreach (['ip_address', 'user_agent', 'host_origin', 'pointer_data', 'raw_evidence'] as $prohibited) {
            $this->assertNotContains($prohibited, $columns);
        }

        $this->assertEqualsCanonicalizing([
            'id',
            'user_id',
            'issuer',
            'issuer_key',
            'ruleset',
            'decision',
            'reason',
            'usage_score',
            'usage_confidence',
            'evaluated_at',
            'expires_at',
            'created_at',
            'updated_at',
        ], Schema::getColumnListing('ctx_automation_risk_assessments'));
    }

    /** @return array{User, ViewerDevice} */
    private function identity(string $email = 'risk@example.test'): array
    {
        $user = User::factory()->create(['email' => $email, 'email_verified_at' => now()]);
        $device = ViewerDevice::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'name' => 'Risk test Viewer',
            'proof_public_key' => $this->digest(),
            'proof_jkt' => $this->digest(),
            'agreement_public_key' => $this->digest(),
            'agreement_jkt' => $this->digest(),
            'status' => ViewerDeviceStatus::Active,
        ]);

        return [$user, $device];
    }

    private function activities(
        User $user,
        ViewerDevice $device,
        AutomationRiskActivityType $type,
        int $count,
        ?\DateTimeInterface $occurredAt = null,
        bool $distinctCapsules = false,
    ): void {
        $rows = [];
        for ($index = 0; $index < $count; $index++) {
            $rows[] = [
                'event_id' => sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING),
                'user_id' => $user->getKey(),
                'viewer_device_id' => $device->getKey(),
                'activity_type' => $type->value,
                'capsule_id' => $distinctCapsules
                    ? 'urn:uuid:'.Str::uuid()->toString()
                    : 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
                'capsule_revision' => 1,
                'occurred_at' => $occurredAt ?? now(),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        foreach (array_chunk($rows, 100) as $chunk) {
            DB::table('ctx_automation_risk_activities')->insert($chunk);
        }
    }

    private function tickets(
        User $user,
        ViewerDevice $device,
        string $kid,
        int $count,
        bool $expired = false,
        int $offset = 0,
    ): void {
        for ($index = 0; $index < $count; $index++) {
            $identifier = 'risk-ticket-'.str_pad((string) ($offset + $index), 5, '0', STR_PAD_LEFT);
            CtxAuthorizationTicket::query()->create([
                'jti' => $identifier,
                'user_id' => $user->getKey(),
                'viewer_device_id' => $device->getKey(),
                'signing_kid' => $kid,
                'ticket_sha256' => hash('sha256', $identifier),
                'broker' => 'https://broker.example.test',
                'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
                'capsule_revision' => 1,
                'policy_sha256' => $this->digest(),
                'payload_id' => 'primary-image',
                'release_handle' => 'opaque-release-handle-0001',
                'proof_jkt' => $device->proof_jkt,
                'agreement_jkt' => $device->agreement_jkt,
                'status' => 'pending',
                'issued_at' => now()->subMinute(),
                'expires_at' => $expired ? now()->subSecond() : now()->addMinute(),
            ]);
        }
    }

    private function digest(): string
    {
        return sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }
}
