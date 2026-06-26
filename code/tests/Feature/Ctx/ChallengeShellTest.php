<?php

namespace Tests\Feature\Ctx;

use App\Ctx\Challenges\ChallengeAttemptOrchestrator;
use App\Models\CtxChallengeAttempt;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Tests\TestCase;

final class ChallengeShellTest extends TestCase
{
    use RefreshDatabase;

    public function test_challenge_attempt_page_exposes_provider_shell_and_accessible_alternates(): void
    {
        [$user, $device] = $this->identity();
        $attempt = $this->attemptWithCircuitTraceModule($user, $device);

        $this->get($this->signedAttemptUrl(
            $attempt,
            returnTo: 'https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback',
        ))
            ->assertOk()
            ->assertSee('data-challenge-shell', false)
            ->assertSee('data-challenge-set-version="'.$attempt->challenge_set_version.'"', false)
            ->assertSee('Quick check')
            ->assertSee('Circuit Trace')
            ->assertSee('data-module-id="circuit_trace"', false)
            ->assertSee('data-input-modes="pointer,touch,keyboard,reduced_motion"', false)
            ->assertSee('role="status"', false)
            ->assertSee('aria-live="polite"', false)
            ->assertSee('Steady mode')
            ->assertSee('Reset trace')
            ->assertSee('supports pointer, touch, keyboard, and reduced-motion input')
            ->assertDontSee('Live score');
    }

    public function test_challenge_attempt_page_has_retry_state_for_expired_attempts(): void
    {
        [$user, $device] = $this->identity();
        $attempt = CtxChallengeAttempt::query()->create([
            'user_id' => $user->getKey(),
            'viewer_device_id' => $device->getKey(),
            'host_origin' => 'http://localhost:3003',
            'broker' => 'http://localhost:3004',
            'capsule_id' => 'urn:uuid:11111111-1111-4111-8111-111111111111',
            'capsule_revision' => 1,
            'policy_sha256' => str_repeat('A', 43),
            'payload_id' => 'trust-capsule',
            'release_handle' => 'challenge-shell-release-handle',
            'action' => 'render',
            'challenge_set_version' => 'ctx-challenge-set-v1.0',
            'selector_version' => 'ctx-challenge-selector-v1.0',
            'scoring_model_version' => 'ctx-challenge-scoring-v1.0',
            'status' => 'pending',
            'issued_at' => now()->subMinutes(20),
            'expires_at' => now()->subMinutes(10),
            'retention_purpose' => ChallengeAttemptOrchestrator::RETENTION_PURPOSE,
            'evidence_retained_until' => now()->addDay(),
        ]);
        $attempt->modules()->create([
            'challenge_id' => 'circuit_trace',
            'module_version' => '1.0.0',
            'lifecycle_state' => 'active',
            'input_modes' => ['pointer', 'touch', 'keyboard', 'reduced_motion'],
            'event_schema_version' => '1.0.0',
            'scoring_adapter' => 'circuit_trace',
            'scoring_adapter_version' => '1.0.0',
            'selection_weight' => 1,
        ]);

        $this->get($this->signedAttemptUrl($attempt, now()->addMinute()))
            ->assertOk()
            ->assertSee('data-challenge-shell', false)
            ->assertSee('Check expired')
            ->assertSee('The active challenge has expired.')
            ->assertSee('Return to Capsule')
            ->assertSee('href="http://localhost:3003/ctx/challenge-playground/circuit-trace?status=failed"', false);
    }

    /** @return array{User, ViewerDevice} */
    private function identity(): array
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $device = ViewerDevice::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'name' => 'Challenge shell Viewer',
            'proof_public_key' => str_repeat('p', 43),
            'proof_jkt' => str_repeat('j', 43),
            'agreement_public_key' => str_repeat('a', 43),
            'agreement_jkt' => str_repeat('k', 43),
            'status' => ViewerDeviceStatus::Active,
        ]);

        return [$user, $device];
    }

    private function signedAttemptUrl(
        CtxChallengeAttempt $attempt,
        mixed $expiresAt = null,
        ?string $returnTo = null,
    ): string {
        return URL::temporarySignedRoute(
            'ctx.challenge-attempts.show',
            $expiresAt ?? $attempt->expires_at,
            [
                'attempt' => $attempt->getKey(),
                'return_to' => $returnTo ?? route('ctx.challenge-playground.circuit-trace', absolute: true),
            ],
        );
    }

    private function attemptWithCircuitTraceModule(User $user, ViewerDevice $device): CtxChallengeAttempt
    {
        $attempt = CtxChallengeAttempt::query()->create([
            'user_id' => $user->getKey(),
            'viewer_device_id' => $device->getKey(),
            'host_origin' => 'http://localhost:3003',
            'broker' => 'http://localhost:3004',
            'capsule_id' => 'urn:uuid:11111111-1111-4111-8111-111111111111',
            'capsule_revision' => 1,
            'policy_sha256' => str_repeat('A', 43),
            'payload_id' => 'trust-capsule',
            'release_handle' => 'challenge-shell-release-handle',
            'action' => 'render',
            'challenge_set_version' => 'ctx-challenge-set-v1.0',
            'selector_version' => 'ctx-challenge-selector-v1.0',
            'scoring_model_version' => 'ctx-challenge-scoring-v1.0',
            'status' => 'pending',
            'issued_at' => now(),
            'expires_at' => now()->addMinutes(10),
            'retention_purpose' => ChallengeAttemptOrchestrator::RETENTION_PURPOSE,
            'evidence_retained_until' => now()->addDay(),
        ]);
        $attempt->modules()->create([
            'challenge_id' => 'circuit_trace',
            'module_version' => '1.0.0',
            'lifecycle_state' => 'active',
            'input_modes' => ['pointer', 'touch', 'keyboard', 'reduced_motion'],
            'event_schema_version' => '1.0.0',
            'scoring_adapter' => 'circuit_trace',
            'scoring_adapter_version' => '1.0.0',
            'selection_weight' => 1,
        ]);

        return $attempt->refresh()->load('modules');
    }
}
