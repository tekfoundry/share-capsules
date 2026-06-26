<?php

namespace Tests\Feature\Account;

use App\Ctx\Challenges\ChallengeAttemptOrchestrator;
use App\Models\CtxChallengeAttempt;
use App\Models\CtxChallengeAttemptModule;
use App\Models\CtxChallengeCadence;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

final class AccountPrivacyControlsTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_privacy_export_includes_controls_without_raw_challenge_evidence(): void
    {
        $user = User::factory()->create(['email' => 'viewer@example.test']);
        $device = $this->device($user);
        $attempt = $this->challengeAttempt($user, $device);
        CtxChallengeCadence::query()->create([
            'scope_sha256' => hash('sha256', 'privacy-scope'),
            'user_id' => $user->getKey(),
            'viewer_device_id' => $device->getKey(),
            'host_origin' => 'https://host.example.test',
            'broker' => 'https://broker.example.test',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'policy_sha256' => str_repeat('p', 43),
            'payload_id' => 'primary-image',
            'release_handle' => 'release-handle-that-must-not-export',
            'action' => 'render',
            'challenge_success_streak' => 1,
            'challenge_refresh_tier' => ChallengeAttemptOrchestrator::CADENCE_TIER_STANDARD,
            'last_challenge_score' => 80,
            'last_challenged_at' => now(),
            'challenge_expires_at' => now()->addDay(),
        ]);

        $response = $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->getJson(route('account.privacy.export'))
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('type', 'share-capsules-account-privacy-export')
            ->assertJsonPath('account.email', 'viewer@example.test')
            ->assertJsonPath('trust_challenge_status.retained_attempt_count', 1)
            ->assertJsonPath('trust_challenge_status.current_cadence_count', 1)
            ->assertJsonPath('trust_challenge_status.raw_interaction_telemetry_retained', false)
            ->assertJsonPath('trust_challenge_status.current_challenge_confidence', 'present')
            ->assertJsonPath(
                'privacy_controls.retained_challenge_evidence_revocation.consequence',
                'Current challenge confidence is cleared; future protected openings may require a fresh challenge.',
            );

        $serialized = $response->getContent();
        $this->assertIsString($serialized);
        $this->assertStringNotContainsString('raw-pointer-trace', $serialized);
        $this->assertStringNotContainsString('release-handle-that-must-not-export', $serialized);
        $this->assertStringNotContainsString($device->proof_public_key, $serialized);
        $this->assertStringNotContainsString((string) $attempt->modules()->sole()->interaction_summary['rawish'], $serialized);
    }

    public function test_privacy_export_and_evidence_revocation_require_recent_authentication(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('account.privacy.export'))
            ->assertRedirect(route('password.confirm'));

        $this->actingAs($user)
            ->delete(route('account.privacy.challenge-evidence.destroy'))
            ->assertRedirect(route('password.confirm'));
    }

    public function test_correction_and_appeal_paths_acknowledge_without_storing_free_text(): void
    {
        $user = User::factory()->create(['email' => 'privacy@example.test']);

        $this->actingAs($user)
            ->postJson(route('account.privacy.correction'), [
                'message' => 'Please correct something sensitive.',
            ])
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('type', 'share-capsules-account-privacy-request')
            ->assertJsonPath('request_type', 'data_correction_request')
            ->assertJsonPath('account_email', 'privacy@example.test')
            ->assertJsonPath('stored_in_app', false)
            ->assertJsonPath('contact', 'info@tekfoundry.com');

        $this->actingAs($user)
            ->postJson(route('account.privacy.appeal'), [
                'message' => 'I want to appeal an automation result.',
            ])
            ->assertOk()
            ->assertJsonPath('request_type', 'appeal_request')
            ->assertJsonPath('stored_in_app', false);
    }

    public function test_retained_challenge_evidence_revocation_clears_attempts_and_current_cadence(): void
    {
        $user = User::factory()->create();
        $device = $this->device($user);
        $this->challengeAttempt($user, $device);
        CtxChallengeCadence::query()->create([
            'scope_sha256' => hash('sha256', 'privacy-revoke-scope'),
            'user_id' => $user->getKey(),
            'viewer_device_id' => $device->getKey(),
            'host_origin' => 'https://host.example.test',
            'broker' => 'https://broker.example.test',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'policy_sha256' => str_repeat('p', 43),
            'payload_id' => 'primary-image',
            'release_handle' => 'opaque-release-handle-0001',
            'action' => 'render',
            'challenge_success_streak' => 3,
            'challenge_refresh_tier' => ChallengeAttemptOrchestrator::CADENCE_TIER_EXTENDED,
            'last_challenge_score' => 92,
            'last_challenged_at' => now(),
            'challenge_expires_at' => now()->addDays(30),
        ]);

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->deleteJson(route('account.privacy.challenge-evidence.destroy'))
            ->assertOk()
            ->assertJsonPath('control', 'retained_challenge_evidence_revocation')
            ->assertJsonPath('removed.attempts', 1)
            ->assertJsonPath('removed.cadences', 1)
            ->assertJsonPath(
                'consequence',
                'Current challenge confidence is cleared; future protected openings may require a fresh challenge.',
            );

        $this->assertDatabaseCount('ctx_challenge_attempts', 0);
        $this->assertDatabaseCount('ctx_challenge_attempt_modules', 0);
        $cadence = CtxChallengeCadence::query()->sole();
        $this->assertSame(0, $cadence->challenge_success_streak);
        $this->assertSame(ChallengeAttemptOrchestrator::CADENCE_TIER_STANDARD, $cadence->challenge_refresh_tier);
        $this->assertNull($cadence->last_challenge_score);
        $this->assertSame('account_privacy_evidence_revoked', $cadence->last_reset_reason);
        $this->assertTrue($cadence->challenge_expires_at->lessThanOrEqualTo(now()));
    }

    private function device(User $user): ViewerDevice
    {
        return ViewerDevice::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'name' => 'Privacy test Viewer',
            'proof_public_key' => $this->key(),
            'proof_jkt' => $this->key(),
            'agreement_public_key' => $this->key(),
            'agreement_jkt' => $this->key(),
            'status' => ViewerDeviceStatus::Active,
        ]);
    }

    private function challengeAttempt(User $user, ViewerDevice $device): CtxChallengeAttempt
    {
        $attempt = CtxChallengeAttempt::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'viewer_device_id' => $device->getKey(),
            'host_origin' => 'https://host.example.test',
            'broker' => 'https://broker.example.test',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'policy_sha256' => str_repeat('p', 43),
            'payload_id' => 'primary-image',
            'release_handle' => 'release-handle-that-must-not-export',
            'action' => 'render',
            'challenge_set_version' => 'ctx-challenge-set-v1.0',
            'selector_version' => 'ctx-challenge-selector-v1.0',
            'scoring_model_version' => 'ctx-challenge-scoring-v1.0',
            'status' => 'completed',
            'challenge_score' => 80,
            'issued_at' => now()->subMinute(),
            'expires_at' => now()->addMinutes(9),
            'retention_purpose' => ChallengeAttemptOrchestrator::RETENTION_PURPOSE,
            'evidence_retained_until' => now()->addDay(),
            'completed_at' => now(),
        ]);

        CtxChallengeAttemptModule::query()->create([
            'ctx_challenge_attempt_id' => $attempt->getKey(),
            'challenge_id' => 'circuit_trace',
            'module_version' => '1.0.0',
            'lifecycle_state' => 'active',
            'input_modes' => ['pointer', 'keyboard'],
            'event_schema_version' => '1.0.0',
            'scoring_adapter' => 'test-adapter',
            'scoring_adapter_version' => '1.0.0',
            'selection_weight' => 1,
            'score' => 80,
            'reason_categories' => ['completed'],
            'interaction_summary' => ['rawish' => 'raw-pointer-trace'],
            'completed_at' => now(),
        ]);

        return $attempt;
    }

    private function key(): string
    {
        return sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }
}
