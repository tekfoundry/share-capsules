<?php

namespace Tests\Unit\Ctx;

use App\Ctx\Risk\AutomationRiskActivityType;
use App\Ctx\Risk\AutomationRiskReason;
use App\Ctx\Risk\V1AutomationRiskRules;
use App\Ctx\SigningKeys\TicketSigningKeyLifecycle;
use App\Ctx\Tickets\CtxTicketRedemptionService;
use App\Ctx\Tickets\TicketRedemptionCode;
use App\Models\CtxAccountCapsuleReleaseCounter;
use App\Models\CtxAuthorizationTicket;
use App\Models\CtxAutomationRiskActivity;
use App\Models\CtxAutomationRiskAssessment;
use App\Models\CtxCapsuleMetricProjection;
use App\Models\CtxCapsuleReleaseCounter;
use App\Models\CtxMetricEventRecord;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
            TicketRedemptionCode::Replayed,
            $service->redeem($ticket->jti, $ticket->ticket_sha256)->code,
        );
        $this->assertSame(
            TicketRedemptionCode::Replayed,
            $service->redeem($ticket->jti, $ticket->ticket_sha256)->code,
        );
        $this->assertSame(1, CtxCapsuleReleaseCounter::query()->value('committed_releases'));
        $this->assertSame(1, CtxAccountCapsuleReleaseCounter::query()->value('committed_releases'));
        $this->assertSame('redeemed', $ticket->refresh()->status);
        $projection = CtxCapsuleMetricProjection::query()->sole();
        $this->assertSame(1, $projection->redemption_committed);
        $this->assertSame(1, $projection->ticket_rejected);
        $this->assertSame(2, CtxMetricEventRecord::query()->count());
        $this->assertSame(3, CtxAutomationRiskActivity::query()->count());
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
    ): CtxAuthorizationTicket {
        return CtxAuthorizationTicket::query()->create([
            'jti' => $jti,
            'user_id' => $user->getKey(),
            'viewer_device_id' => $device->getKey(),
            'signing_kid' => $kid,
            'ticket_sha256' => hash('sha256', $jti),
            'broker' => 'https://broker.example.test',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'policy_sha256' => $this->digest(),
            'payload_id' => 'primary-image',
            'release_handle' => 'opaque-release-handle-0001',
            'proof_jkt' => $device->proof_jkt,
            'agreement_jkt' => $device->agreement_jkt,
            'capsule_lifetime_limit' => $capsuleLimit,
            'account_capsule_lifetime_limit' => $accountLimit,
            'automation_risk_issuer' => $riskIssuer,
            'status' => 'pending',
            'issued_at' => now()->subMinute(),
            'expires_at' => $expired ? now()->subSecond() : now()->addMinute(),
        ]);
    }

    private function digest(): string
    {
        return sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }
}
