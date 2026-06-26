<?php

namespace Tests\Feature\Ctx;

use App\Ctx\Challenges\ChallengeAttemptOrchestrator;
use App\Models\CtxChallengeAttempt;
use App\Models\CtxChallengeAttemptModule;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class BalanceBeamCalibrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_balance_beam_attempt_renders_from_signed_challenge_page(): void
    {
        $attempt = $this->attempt();

        $this->get($this->showUrl($attempt))
            ->assertOk()
            ->assertSee('Balance Beam')
            ->assertSee('data-seed="'.$attempt->getKey().'"', false)
            ->assertSee('data-module-id="balance_beam"', false)
            ->assertSee('name="safe_ms"', false)
            ->assertSee('/ctx/challenge-attempts/'.$attempt->getKey().'/modules/balance-beam', false)
            ->assertDontSee('Live score');
    }

    #[DataProvider('completionCases')]
    public function test_balance_beam_completion_calibration(
        string $label,
        int $elapsedMs,
        int $safeMs,
        int $correctionCount,
        int $edgeTouchCount,
        string $inputMode,
        int $expectedScore,
        array $expectedReasons,
    ): void {
        $attempt = $this->attempt();

        $this->post($this->completionUrl($attempt), [
            'elapsed_ms' => $elapsedMs,
            'safe_ms' => $safeMs,
            'correction_count' => $correctionCount,
            'edge_touch_count' => $edgeTouchCount,
            'input_mode' => $inputMode,
        ])->assertRedirect('https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback?status=completed');

        $this->assertDatabaseHas('ctx_challenge_attempts', [
            'id' => $attempt->getKey(),
            'status' => 'completed',
            'challenge_score' => $expectedScore,
        ]);

        $module = CtxChallengeAttemptModule::query()
            ->where('ctx_challenge_attempt_id', $attempt->getKey())
            ->sole();
        $this->assertSame($expectedScore, $module->score, $label);
        $this->assertEqualsCanonicalizing($expectedReasons, $module->reason_categories);
    }

    public function test_balance_beam_completion_rejects_replay(): void
    {
        $attempt = $this->attempt();
        $url = $this->completionUrl($attempt);
        $payload = [
            'elapsed_ms' => 20000,
            'safe_ms' => 19000,
            'correction_count' => 16,
            'edge_touch_count' => 0,
            'input_mode' => 'pointer',
        ];

        $this->post($url, $payload)
            ->assertRedirect('https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback?status=completed');
        $this->post($url, $payload)
            ->assertRedirect('https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback?status=failed');

        $this->assertDatabaseHas('ctx_challenge_attempts', [
            'id' => $attempt->getKey(),
            'status' => 'completed',
            'challenge_score' => 95,
        ]);
    }

    public function test_balance_beam_completion_rejects_expired_attempt(): void
    {
        $attempt = $this->attempt();
        $attempt->forceFill(['expires_at' => now()->subMinute()])->save();

        $this->post($this->completionUrl($attempt, now()->addMinute()), [
            'elapsed_ms' => 20000,
            'safe_ms' => 19000,
            'correction_count' => 16,
            'edge_touch_count' => 0,
            'input_mode' => 'pointer',
        ])->assertRedirect('https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback?status=failed');

        $this->assertDatabaseHas('ctx_challenge_attempts', [
            'id' => $attempt->getKey(),
            'status' => 'pending',
            'challenge_score' => null,
        ]);
    }

    /** @return iterable<string, array{string, int, int, int, int, string, int, list<string>}> */
    public static function completionCases(): iterable
    {
        yield 'steady pointer pass' => [
            'steady pointer pass',
            20000,
            19000,
            16,
            0,
            'pointer',
            95,
            ['pointer'],
        ];
        yield 'touch pass with edge touches' => [
            'touch pass with edge touches',
            20000,
            18000,
            14,
            1,
            'touch',
            86,
            ['touch', 'edge_touches'],
        ];
        yield 'too few corrections caps score' => [
            'too few corrections caps score',
            20000,
            20000,
            2,
            0,
            'keyboard',
            55,
            ['keyboard', 'too_few_corrections', 'not_stable_enough'],
        ];
        yield 'low stability with edge touches' => [
            'low stability with edge touches',
            20000,
            11000,
            18,
            6,
            'pointer',
            31,
            ['pointer', 'edge_touches', 'not_stable_enough'],
        ];
        yield 'impossible fast completion' => [
            'impossible fast completion',
            1200,
            1200,
            8,
            0,
            'pointer',
            20,
            ['pointer', 'too_fast', 'not_stable_enough'],
        ];
    }

    private function attempt(): CtxChallengeAttempt
    {
        [$user, $device] = $this->identity();
        $now = now();
        $attempt = CtxChallengeAttempt::query()->create([
            'id' => '019f00d1-0000-7000-8000-000000000001',
            'user_id' => $user->getKey(),
            'viewer_device_id' => $device->getKey(),
            'host_origin' => 'https://host.example.test',
            'broker' => 'https://broker.example.test',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'policy_sha256' => str_repeat('a', 43),
            'payload_id' => 'primary-image',
            'release_handle' => 'opaque-release-handle-0001',
            'action' => 'render',
            'challenge_set_version' => 'ctx-challenge-set-v1.0',
            'selector_version' => 'ctx-challenge-selector-v1.0',
            'scoring_model_version' => 'ctx-challenge-scoring-v1.0',
            'status' => 'pending',
            'issued_at' => $now,
            'expires_at' => $now->copy()->addMinutes(10),
            'retention_purpose' => ChallengeAttemptOrchestrator::RETENTION_PURPOSE,
            'evidence_retained_until' => $now->copy()->addDay(),
        ]);
        $attempt->modules()->create([
            'challenge_id' => 'balance_beam',
            'module_version' => '1.0.0',
            'lifecycle_state' => 'draft',
            'input_modes' => ['pointer', 'touch', 'keyboard', 'reduced_motion'],
            'event_schema_version' => '1.0.0',
            'scoring_adapter' => 'balance_beam',
            'scoring_adapter_version' => '1.0.0',
            'selection_weight' => 1,
        ]);

        return $attempt->refresh()->load('modules');
    }

    private function completionUrl(CtxChallengeAttempt $attempt, mixed $expires = null): string
    {
        return URL::temporarySignedRoute(
            'ctx.challenge-attempts.balance-beam.complete',
            $expires ?? $attempt->expires_at,
            [
                'attempt' => $attempt->getKey(),
                'return_to' => 'https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback',
            ],
        );
    }

    private function showUrl(CtxChallengeAttempt $attempt, mixed $expires = null): string
    {
        return URL::temporarySignedRoute(
            'ctx.challenge-attempts.show',
            $expires ?? $attempt->expires_at,
            [
                'attempt' => $attempt->getKey(),
                'return_to' => 'https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback',
            ],
        );
    }

    /** @return array{User, ViewerDevice} */
    private function identity(): array
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $device = ViewerDevice::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'name' => 'Balance Beam calibration Viewer',
            'proof_public_key' => str_repeat('p', 43),
            'proof_jkt' => str_repeat('j', 43),
            'agreement_public_key' => str_repeat('a', 43),
            'agreement_jkt' => str_repeat('k', 43),
            'status' => ViewerDeviceStatus::Active,
        ]);

        return [$user, $device];
    }
}
