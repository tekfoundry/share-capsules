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

final class PatternRepairCalibrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_pattern_repair_attempt_renders_from_signed_challenge_page(): void
    {
        $attempt = $this->attempt();

        $this->get($this->showUrl($attempt))
            ->assertOk()
            ->assertSee('Pattern Repair')
            ->assertSee('data-seed="'.$attempt->getKey().'"', false)
            ->assertSee('data-module-id="pattern_repair"', false)
            ->assertSee('name="correct_count"', false)
            ->assertSee('name="mistake_count"', false)
            ->assertSee('/ctx/challenge-attempts/'.$attempt->getKey().'/modules/pattern-repair', false)
            ->assertDontSee('Live score');
    }

    #[DataProvider('completionCases')]
    public function test_pattern_repair_completion_calibration(
        string $label,
        int $elapsedMs,
        int $correctCount,
        int $mistakeCount,
        int $attemptCount,
        string $inputMode,
        int $expectedScore,
        array $expectedReasons,
    ): void {
        $attempt = $this->attempt();

        $this->post($this->completionUrl($attempt), [
            'elapsed_ms' => $elapsedMs,
            'correct_count' => $correctCount,
            'mistake_count' => $mistakeCount,
            'attempt_count' => $attemptCount,
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

    public function test_pattern_repair_completion_rejects_replay(): void
    {
        $attempt = $this->attempt();
        $url = $this->completionUrl($attempt);
        $payload = [
            'elapsed_ms' => 30000,
            'correct_count' => 5,
            'mistake_count' => 0,
            'attempt_count' => 5,
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

    public function test_pattern_repair_completion_rejects_expired_attempt(): void
    {
        $attempt = $this->attempt();
        $attempt->forceFill(['expires_at' => now()->subMinute()])->save();

        $this->post($this->completionUrl($attempt, now()->addMinute()), [
            'elapsed_ms' => 30000,
            'correct_count' => 5,
            'mistake_count' => 0,
            'attempt_count' => 5,
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
        yield 'five correct pointer pass' => [
            'five correct pointer pass',
            30000,
            5,
            0,
            5,
            'pointer',
            100,
            ['pointer'],
        ];
        yield 'four correct with one mistake' => [
            'four correct with one mistake',
            30000,
            4,
            1,
            5,
            'touch',
            72,
            ['touch', 'pattern_mistakes', 'not_complete_enough'],
        ];
        yield 'three correct keyboard pass' => [
            'three correct keyboard pass',
            30000,
            3,
            0,
            3,
            'keyboard',
            60,
            ['keyboard', 'not_complete_enough'],
        ];
        yield 'no correct answers' => [
            'no correct answers',
            30000,
            0,
            3,
            3,
            'pointer',
            0,
            ['pointer', 'no_correct_patterns', 'pattern_mistakes', 'not_complete_enough'],
        ];
        yield 'impossible fast high score' => [
            'impossible fast high score',
            900,
            4,
            0,
            4,
            'pointer',
            25,
            ['pointer', 'too_fast', 'not_complete_enough'],
        ];
    }

    private function attempt(): CtxChallengeAttempt
    {
        [$user, $device] = $this->identity();
        $now = now();
        $attempt = CtxChallengeAttempt::query()->create([
            'id' => '019f00d2-0000-7000-8000-000000000001',
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
            'challenge_id' => 'pattern_repair',
            'module_version' => '1.0.0',
            'lifecycle_state' => 'draft',
            'input_modes' => ['pointer', 'touch', 'keyboard', 'reduced_motion'],
            'event_schema_version' => '1.0.0',
            'scoring_adapter' => 'pattern_repair',
            'scoring_adapter_version' => '1.0.0',
            'selection_weight' => 1,
        ]);

        return $attempt->refresh()->load('modules');
    }

    private function completionUrl(CtxChallengeAttempt $attempt, mixed $expires = null): string
    {
        return URL::temporarySignedRoute(
            'ctx.challenge-attempts.pattern-repair.complete',
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
            'name' => 'Pattern Repair calibration Viewer',
            'proof_public_key' => str_repeat('p', 43),
            'proof_jkt' => str_repeat('j', 43),
            'agreement_public_key' => str_repeat('a', 43),
            'agreement_jkt' => str_repeat('k', 43),
            'status' => ViewerDeviceStatus::Active,
        ]);

        return [$user, $device];
    }
}
