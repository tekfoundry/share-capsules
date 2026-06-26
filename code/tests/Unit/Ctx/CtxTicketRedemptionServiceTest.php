<?php

namespace Tests\Unit\Ctx;

use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Ctx\Challenges\ChallengeAttemptContext;
use App\Ctx\Risk\AutomationRiskActivityType;
use App\Ctx\Risk\AutomationRiskReason;
use App\Ctx\Risk\V1AutomationRiskRules;
use App\Ctx\SigningKeys\TicketSigningKeyLifecycle;
use App\Ctx\Tickets\CtxTicketRedemptionService;
use App\Ctx\Tickets\TicketRedemptionCode;
use App\Models\CreatorCapsule;
use App\Models\CtxAccountCapsuleReleaseCounter;
use App\Models\CtxAuthorizationTicket;
use App\Models\CtxAutomationRiskActivity;
use App\Models\CtxAutomationRiskAssessment;
use App\Models\CtxCapsuleMetricProjection;
use App\Models\CtxCapsuleReleaseCounter;
use App\Models\CtxChallengeAttempt;
use App\Models\CtxChallengeCadence;
use App\Models\CtxMetricEventRecord;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class CtxTicketRedemptionServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_commit_is_atomic_and_replay_never_double_counts(): void
    {
        [$user, $device, $kid] = $this->identity();
        $ticket = $this->ticket($user, $device, $kid, 'ticket-redemption-0001', 2, 2);
        $service = app(CtxTicketRedemptionService::class);

        $this->assertSame(
            TicketRedemptionCode::Committed,
            $service->redeem($ticket->jti, $ticket->ticket_sha256)->code,
        );
        $this->assertSame(
            TicketRedemptionCode::AlreadyCommitted,
            $service->redeem($ticket->jti, $ticket->ticket_sha256)->code,
        );
        $this->assertSame(
            TicketRedemptionCode::AlreadyCommitted,
            $service->redeem($ticket->jti, $ticket->ticket_sha256)->code,
        );
        $this->assertSame(1, CtxCapsuleReleaseCounter::query()->value('committed_releases'));
        $this->assertSame(1, CtxAccountCapsuleReleaseCounter::query()->value('committed_releases'));
        $this->assertSame('redeemed', $ticket->refresh()->status);
        $projection = CtxCapsuleMetricProjection::query()->sole();
        $this->assertSame(1, $projection->redemption_committed);
        $this->assertSame(0, $projection->ticket_rejected);
        $this->assertSame(1, CtxMetricEventRecord::query()->count());
        $this->assertSame(1, CtxAutomationRiskActivity::query()->count());
    }

    public function test_a_second_pending_ticket_cannot_exceed_the_exact_limit(): void
    {
        [$user, $device, $kid] = $this->identity();
        $first = $this->ticket($user, $device, $kid, 'ticket-redemption-0001', 1, 1);
        $second = $this->ticket($user, $device, $kid, 'ticket-redemption-0002', 1, 1);
        $service = app(CtxTicketRedemptionService::class);

        $this->assertSame(TicketRedemptionCode::Committed, $service->redeem($first->jti, $first->ticket_sha256)->code);
        $this->assertSame(
            TicketRedemptionCode::CapsuleLimitReached,
            $service->redeem($second->jti, $second->ticket_sha256)->code,
        );
        $this->assertSame(1, CtxCapsuleReleaseCounter::query()->value('committed_releases'));
        $this->assertSame('pending', $second->refresh()->status);
    }

    public function test_expired_or_mismatched_tickets_never_count(): void
    {
        [$user, $device, $kid] = $this->identity();
        $ticket = $this->ticket($user, $device, $kid, 'ticket-redemption-0001', null, null, true);
        $service = app(CtxTicketRedemptionService::class);

        $this->assertSame(TicketRedemptionCode::Invalid, $service->redeem($ticket->jti, str_repeat('0', 64))->code);
        $this->assertSame(TicketRedemptionCode::Expired, $service->redeem($ticket->jti, $ticket->ticket_sha256)->code);
        $this->assertSame(0, CtxCapsuleReleaseCounter::query()->count());
    }

    public function test_registry_revocation_wins_the_race_before_any_counter_increment(): void
    {
        [$user, $device, $kid] = $this->identity();
        $ticket = $this->ticket($user, $device, $kid, 'ticket-revoked-before-redemption', null, null);
        CreatorCapsule::query()->sole()->forceFill(['status' => CapsuleLifecycleStatus::Revoked])->save();

        $result = app(CtxTicketRedemptionService::class)->redeem($ticket->jti, $ticket->ticket_sha256);

        $this->assertSame(TicketRedemptionCode::PolicyUnsatisfied, $result->code);
        $this->assertDatabaseCount('ctx_capsule_release_counters', 0);
        $this->assertSame('pending', $ticket->fresh()->status);
    }

    public function test_current_automation_risk_is_rechecked_at_redemption(): void
    {
        [$user, $device, $kid] = $this->identity();
        $ticket = $this->ticket(
            $user,
            $device,
            $kid,
            'ticket-redemption-risk',
            null,
            null,
            riskIssuer: (string) config('sharecapsules.ctx.issuer'),
        );
        $rows = [];
        for ($index = 0; $index < V1AutomationRiskRules::TICKET_REJECTION_LIMIT; $index++) {
            $rows[] = [
                'event_id' => sodium_bin2base64(hash('sha256', 'rejection-'.$index, true), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING),
                'user_id' => $user->getKey(),
                'viewer_device_id' => $device->getKey(),
                'activity_type' => AutomationRiskActivityType::TicketRejected->value,
                'capsule_id' => $ticket->capsule_id,
                'capsule_revision' => 1,
                'occurred_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        DB::table('ctx_automation_risk_activities')->insert($rows);

        $result = app(CtxTicketRedemptionService::class)->redeem($ticket->jti, $ticket->ticket_sha256);

        $this->assertSame(TicketRedemptionCode::AutomationRiskHigh, $result->code);
        $this->assertSame('pending', $ticket->fresh()->status);
        $this->assertDatabaseCount('ctx_capsule_release_counters', 1);
        $this->assertSame(0, CtxCapsuleReleaseCounter::query()->value('committed_releases'));
        $this->assertSame(AutomationRiskReason::TicketMisuse, CtxAutomationRiskAssessment::query()->sole()->reason);
        $this->assertSame(V1AutomationRiskRules::TICKET_REJECTION_LIMIT, CtxAutomationRiskActivity::query()->count());
    }

    public function test_current_trust_capsule_challenge_evidence_is_rechecked_at_redemption(): void
    {
        [$user, $device, $kid] = $this->identity();
        $ticket = $this->ticket(
            $user,
            $device,
            $kid,
            'ticket-redemption-challenge',
            null,
            null,
            riskIssuer: (string) config('sharecapsules.ctx.issuer'),
        );
        $service = app(CtxTicketRedemptionService::class);

        $this->assertSame(
            TicketRedemptionCode::PolicyUnsatisfied,
            $service->redeem($ticket->jti, $ticket->ticket_sha256)->code,
        );
        $this->assertSame('pending', $ticket->fresh()->status);
        $this->assertSame(0, CtxCapsuleReleaseCounter::query()->value('committed_releases'));

        $this->challengeAttempt($ticket, $user, $device, now()->addMinutes(10));

        $this->assertSame(
            TicketRedemptionCode::Committed,
            $service->redeem($ticket->jti, $ticket->ticket_sha256)->code,
        );
        $this->assertSame('redeemed', $ticket->fresh()->status);
        $this->assertSame(1, CtxCapsuleReleaseCounter::query()->value('committed_releases'));
    }

    public function test_expired_trust_capsule_challenge_evidence_cannot_redeem_a_ticket(): void
    {
        [$user, $device, $kid] = $this->identity();
        $ticket = $this->ticket(
            $user,
            $device,
            $kid,
            'ticket-redemption-expired-challenge',
            null,
            null,
            riskIssuer: (string) config('sharecapsules.ctx.issuer'),
        );
        $this->challengeAttempt($ticket, $user, $device, now()->subMinute());

        $this->assertSame(
            TicketRedemptionCode::PolicyUnsatisfied,
            app(CtxTicketRedemptionService::class)->redeem($ticket->jti, $ticket->ticket_sha256)->code,
        );
        $this->assertSame('pending', $ticket->fresh()->status);
        $this->assertSame(0, CtxCapsuleReleaseCounter::query()->value('committed_releases'));
    }

    public function test_access_window_is_rechecked_at_redemption_boundaries(): void
    {
        [$user, $device, $kid] = $this->identity();
        $service = app(CtxTicketRedemptionService::class);
        $notYetOpen = $this->ticket(
            $user,
            $device,
            $kid,
            'ticket-window-early',
            null,
            null,
            notBefore: CarbonImmutable::parse('2026-07-01T05:00:00Z'),
        );
        $atClose = $this->ticket(
            $user,
            $device,
            $kid,
            'ticket-window-closed',
            null,
            null,
            notAfter: CarbonImmutable::parse('2026-08-01T05:00:00Z'),
        );

        $this->assertSame(
            TicketRedemptionCode::PolicyUnsatisfied,
            $service->redeem($notYetOpen->jti, $notYetOpen->ticket_sha256, CarbonImmutable::parse('2026-07-01T04:59:59Z'))->code,
        );
        $this->assertSame(
            TicketRedemptionCode::Committed,
            $service->redeem($notYetOpen->jti, $notYetOpen->ticket_sha256, CarbonImmutable::parse('2026-07-01T05:00:00Z'))->code,
        );
        $this->assertSame(
            TicketRedemptionCode::PolicyUnsatisfied,
            $service->redeem($atClose->jti, $atClose->ticket_sha256, CarbonImmutable::parse('2026-08-01T05:00:00Z'))->code,
        );
    }

    /** @return array{User, ViewerDevice, string} */
    private function identity(): array
    {
        $key = app(TicketSigningKeyLifecycle::class)->stage();
        app(TicketSigningKeyLifecycle::class)->activate($key->kid);
        $user = User::factory()->create(['email_verified_at' => now()]);
        $device = ViewerDevice::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'name' => 'Viewer',
            'proof_public_key' => $this->digest(),
            'proof_jkt' => $this->digest(),
            'agreement_public_key' => $this->digest(),
            'agreement_jkt' => $this->digest(),
            'status' => ViewerDeviceStatus::Active,
        ]);

        return [$user, $device, $key->kid];
    }

    private function ticket(
        User $user,
        ViewerDevice $device,
        string $kid,
        string $jti,
        ?int $capsuleLimit,
        ?int $accountLimit,
        bool $expired = false,
        ?string $riskIssuer = null,
        ?CarbonImmutable $notBefore = null,
        ?CarbonImmutable $notAfter = null,
    ): CtxAuthorizationTicket {
        $referenceTime = $notBefore ?? $notAfter ?? CarbonImmutable::now();
        $policySha256 = $this->digest();
        $releaseHandle = 'opaque-release-handle-0001';
        CreatorCapsule::query()->firstOrCreate([
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
        ], [
            'user_id' => $user->getKey(),
            'registration_id' => 'registration_'.str_repeat('a', 32),
            'payload_id' => 'primary-image',
            'broker' => 'https://broker.example.test',
            'release_handle' => $releaseHandle,
            'policy_sha256' => $policySha256,
            'policy' => [],
            'status' => CapsuleLifecycleStatus::Active,
            'pending_expires_at' => $referenceTime,
            'finalized_at' => $referenceTime,
        ]);
        $registered = CreatorCapsule::query()->sole();

        return CtxAuthorizationTicket::query()->create([
            'jti' => $jti,
            'user_id' => $user->getKey(),
            'viewer_device_id' => $device->getKey(),
            'signing_kid' => $kid,
            'ticket_sha256' => hash('sha256', $jti),
            'host_origin' => 'https://host.example.test',
            'broker' => 'https://broker.example.test',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'policy_sha256' => $registered->policy_sha256,
            'payload_id' => 'primary-image',
            'release_handle' => $registered->release_handle,
            'action' => 'render',
            'proof_jkt' => $device->proof_jkt,
            'agreement_jkt' => $device->agreement_jkt,
            'capsule_lifetime_limit' => $capsuleLimit,
            'account_capsule_lifetime_limit' => $accountLimit,
            'automation_risk_issuer' => $riskIssuer,
            'not_before' => $notBefore,
            'not_after' => $notAfter,
            'status' => 'pending',
            'issued_at' => $referenceTime->subMinute(),
            'expires_at' => $expired ? now()->subSecond() : $referenceTime->addMinute(),
        ]);
    }

    private function challengeAttempt(
        CtxAuthorizationTicket $ticket,
        User $user,
        ViewerDevice $device,
        CarbonImmutable|Carbon $expiresAt,
    ): CtxChallengeAttempt {
        $attempt = CtxChallengeAttempt::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'viewer_device_id' => $device->getKey(),
            'host_origin' => $ticket->host_origin,
            'broker' => $ticket->broker,
            'capsule_id' => $ticket->capsule_id,
            'capsule_revision' => $ticket->capsule_revision,
            'policy_sha256' => $ticket->policy_sha256,
            'payload_id' => $ticket->payload_id,
            'release_handle' => $ticket->release_handle,
            'action' => $ticket->action,
            'challenge_set_version' => 'ctx-challenge-set-test',
            'selector_version' => 'ctx-challenge-selector-test',
            'scoring_model_version' => 'ctx-challenge-scoring-test',
            'status' => 'completed',
            'challenge_score' => 80,
            'issued_at' => now()->subMinute(),
            'expires_at' => $expiresAt,
            'completed_at' => now()->subSecond(),
        ]);

        $context = new ChallengeAttemptContext(
            hostOrigin: $ticket->host_origin,
            broker: $ticket->broker,
            capsuleId: $ticket->capsule_id,
            capsuleRevision: $ticket->capsule_revision,
            policySha256: $ticket->policy_sha256,
            payloadId: $ticket->payload_id,
            releaseHandle: $ticket->release_handle,
            action: $ticket->action,
        );
        CtxChallengeCadence::query()->create([
            'scope_sha256' => CtxChallengeCadence::scopeKey($user, $device, $context),
            'user_id' => $user->getKey(),
            'viewer_device_id' => $device->getKey(),
            'host_origin' => $ticket->host_origin,
            'broker' => $ticket->broker,
            'capsule_id' => $ticket->capsule_id,
            'capsule_revision' => $ticket->capsule_revision,
            'policy_sha256' => $ticket->policy_sha256,
            'payload_id' => $ticket->payload_id,
            'release_handle' => $ticket->release_handle,
            'action' => $ticket->action,
            'challenge_success_streak' => 1,
            'challenge_refresh_tier' => 'standard',
            'last_challenge_score' => 80,
            'last_challenged_at' => now()->subSecond(),
            'challenge_expires_at' => $expiresAt,
        ]);

        return $attempt;
    }

    private function digest(): string
    {
        return sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }
}
