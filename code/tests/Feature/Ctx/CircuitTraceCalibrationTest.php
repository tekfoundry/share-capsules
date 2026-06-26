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

final class CircuitTraceCalibrationTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('completionCases')]
    public function test_circuit_trace_completion_calibration(
        string $label,
        int $elapsedMs,
        int $checkpoints,
        int $wallTouches,
        string $inputMode,
        int $expectedScore,
        array $expectedReasons,
    ): void {
        $attempt = $this->attempt();

        $this->post($this->completionUrl($attempt), [
            'elapsed_ms' => $elapsedMs,
            'path_checkpoints' => $checkpoints,
            'wall_touches' => $wallTouches,
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

    public function test_circuit_trace_completion_rejects_replay(): void
    {
        $attempt = $this->attempt();
        $url = $this->completionUrl($attempt);

        $this->post($url, [
            'elapsed_ms' => 2400,
            'path_checkpoints' => 8,
            'wall_touches' => 0,
            'input_mode' => 'pointer',
        ])->assertRedirect('https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback?status=completed');

        $this->post($url, [
            'elapsed_ms' => 2600,
            'path_checkpoints' => 8,
            'wall_touches' => 0,
            'input_mode' => 'pointer',
        ])->assertRedirect('https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback?status=failed');

        $this->assertDatabaseHas('ctx_challenge_attempts', [
            'id' => $attempt->getKey(),
            'status' => 'completed',
            'challenge_score' => 100,
        ]);
    }

    public function test_circuit_trace_completion_rejects_expired_attempt(): void
    {
        $attempt = $this->attempt();
        $attempt->forceFill(['expires_at' => now()->subMinute()])->save();

        $this->post($this->completionUrl($attempt, now()->addMinute()), [
            'elapsed_ms' => 2400,
            'path_checkpoints' => 8,
            'wall_touches' => 0,
            'input_mode' => 'pointer',
        ])->assertRedirect('https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback?status=failed');

        $this->assertDatabaseHas('ctx_challenge_attempts', [
            'id' => $attempt->getKey(),
            'status' => 'pending',
            'challenge_score' => null,
        ]);
    }

    /** @return iterable<string, array{string, int, int, int, string, int, list<string>}> */
    public static function completionCases(): iterable
    {
        yield 'normal pointer clean pass' => [
            'normal pointer clean pass',
            2400,
            8,
            0,
            'pointer',
            100,
            ['pointer'],
        ];
        yield 'normal touch with two touches' => [
            'normal touch with two touches',
            3200,
            8,
            2,
            'touch',
            84,
            ['touch', 'wall_touches'],
        ];
        yield 'alternate keyboard at passing boundary' => [
            'alternate keyboard at passing boundary',
            3600,
            8,
            4,
            'keyboard',
            70,
            ['keyboard', 'wall_touches'],
        ];
        yield 'alternate reduced motion over touch limit' => [
            'alternate reduced motion over touch limit',
            5200,
            8,
            7,
            'reduced_motion',
            55,
            ['reduced_motion', 'wall_touches'],
        ];
        yield 'impossible fast completion' => [
            'impossible fast completion',
            900,
            8,
            0,
            'pointer',
            20,
            ['pointer', 'too_fast'],
        ];
        yield 'failed incomplete path' => [
            'failed incomplete path',
            2400,
            7,
            0,
            'pointer',
            0,
            ['pointer', 'incomplete_path'],
        ];
    }

    private function attempt(): CtxChallengeAttempt
    {
        [$user, $device] = $this->identity();

        $attempt = CtxChallengeAttempt::query()->create([
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

    private function completionUrl(CtxChallengeAttempt $attempt, mixed $expires = null): string
    {
        return URL::temporarySignedRoute(
            'ctx.challenge-attempts.circuit-trace.complete',
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
            'name' => 'Circuit Trace calibration Viewer',
            'proof_public_key' => str_repeat('p', 43),
            'proof_jkt' => str_repeat('j', 43),
            'agreement_public_key' => str_repeat('a', 43),
            'agreement_jkt' => str_repeat('k', 43),
            'status' => ViewerDeviceStatus::Active,
        ]);

        return [$user, $device];
    }
}
