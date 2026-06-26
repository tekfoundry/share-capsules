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

final class MemoryPathCalibrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_memory_path_attempt_renders_from_signed_challenge_page(): void
    {
        $attempt = $this->attempt();

        $this->get($this->showUrl($attempt))
            ->assertOk()
            ->assertSee('Memory Path')
            ->assertSee('data-seed="'.$attempt->getKey().'"', false)
            ->assertSee('data-module-id="memory_path"', false)
            ->assertSee('name="replay_count"', false)
            ->assertSee('/ctx/challenge-attempts/'.$attempt->getKey().'/modules/memory-path', false)
            ->assertDontSee('Live score');
    }

    #[DataProvider('completionCases')]
    public function test_memory_path_completion_calibration(
        string $label,
        int $elapsedMs,
        int $correctCount,
        int $mistakeCount,
        int $replayCount,
        string $inputMode,
        int $expectedScore,
        array $expectedReasons,
    ): void {
        $attempt = $this->attempt();

        $this->post($this->completionUrl($attempt), [
            'elapsed_ms' => $elapsedMs,
            'sequence_length' => max(1, $correctCount),
            'correct_count' => $correctCount,
            'mistake_count' => $mistakeCount,
            'replay_count' => $replayCount,
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

    public function test_memory_path_completion_rejects_replay(): void
    {
        $attempt = $this->attempt();
        $url = $this->completionUrl($attempt);
        $payload = [
            'elapsed_ms' => 4200,
            'sequence_length' => 6,
            'correct_count' => 6,
            'mistake_count' => 0,
            'replay_count' => 6,
            'input_mode' => 'pointer',
        ];

        $this->post($url, $payload)
            ->assertRedirect('https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback?status=completed');
        $this->post($url, $payload)
            ->assertRedirect('https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback?status=failed');

        $this->assertDatabaseHas('ctx_challenge_attempts', [
            'id' => $attempt->getKey(),
            'status' => 'completed',
            'challenge_score' => 100,
        ]);
    }

    public function test_memory_path_completion_rejects_expired_attempt(): void
    {
        $attempt = $this->attempt();
        $attempt->forceFill(['expires_at' => now()->subMinute()])->save();

        $this->post($this->completionUrl($attempt, now()->addMinute()), [
            'elapsed_ms' => 4200,
            'sequence_length' => 8,
            'correct_count' => 8,
            'mistake_count' => 0,
            'replay_count' => 8,
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
        yield 'normal pointer clean pass' => [
            'normal pointer clean pass',
            30000,
            6,
            0,
            6,
            'pointer',
            100,
            ['pointer'],
        ];
        yield 'keyboard strong pass with one mistake' => [
            'keyboard strong pass with one mistake',
            30000,
            5,
            1,
            6,
            'keyboard',
            90,
            ['keyboard', 'sequence_mistakes'],
        ];
        yield 'impossible fast high level' => [
            'impossible fast high level',
            900,
            6,
            0,
            6,
            'pointer',
            20,
            ['pointer', 'too_fast', 'not_complete_enough'],
        ];
        yield 'low progress with mistake' => [
            'low progress with mistake',
            30000,
            3,
            1,
            4,
            'touch',
            50,
            ['touch', 'sequence_mistakes', 'not_complete_enough'],
        ];
    }

    private function attempt(): CtxChallengeAttempt
    {
        [$user, $device] = $this->identity();
        $now = now();
        $attempt = CtxChallengeAttempt::query()->create([
            'id' => '019f00d0-0000-7000-8000-000000000001',
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
            'challenge_id' => 'memory_path',
            'module_version' => '1.0.0',
            'lifecycle_state' => 'draft',
            'input_modes' => ['pointer', 'touch', 'keyboard', 'reduced_motion'],
            'event_schema_version' => '1.0.0',
            'scoring_adapter' => 'memory_path',
            'scoring_adapter_version' => '1.0.0',
            'selection_weight' => 1,
        ]);

        return $attempt->refresh()->load('modules');
    }

    private function completionUrl(CtxChallengeAttempt $attempt, mixed $expires = null): string
    {
        return URL::temporarySignedRoute(
            'ctx.challenge-attempts.memory-path.complete',
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
            'name' => 'Memory Path calibration Viewer',
            'proof_public_key' => str_repeat('p', 43),
            'proof_jkt' => str_repeat('j', 43),
            'agreement_public_key' => str_repeat('a', 43),
            'agreement_jkt' => str_repeat('k', 43),
            'status' => ViewerDeviceStatus::Active,
        ]);

        return [$user, $device];
    }
}
