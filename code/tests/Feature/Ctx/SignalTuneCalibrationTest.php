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

final class SignalTuneCalibrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_signal_tune_attempt_renders_from_signed_challenge_page(): void
    {
        $attempt = $this->attempt();

        $this->get($this->showUrl($attempt))
            ->assertOk()
            ->assertSee('Signal Tune')
            ->assertSee('data-seed="'.$attempt->getKey().'"', false)
            ->assertSee('data-module-id="signal_tune"', false)
            ->assertSee('name="adjustment_count"', false)
            ->assertSee('/ctx/challenge-attempts/'.$attempt->getKey().'/modules/signal-tune', false)
            ->assertDontSee('Live score');
    }

    #[DataProvider('completionCases')]
    public function test_signal_tune_completion_calibration(
        string $label,
        int $elapsedMs,
        int $amplitudeOffset,
        int $frequencyOffset,
        int $phaseOffset,
        int $adjustmentCount,
        string $inputMode,
        int $expectedScore,
        array $expectedReasons,
    ): void {
        $attempt = $this->attempt();
        $target = $this->targetFor((string) $attempt->getKey());

        $this->post($this->completionUrl($attempt), [
            'elapsed_ms' => $elapsedMs,
            'amplitude' => $target['amplitude'] + $amplitudeOffset,
            'frequency' => $target['frequency'] + $frequencyOffset,
            'phase' => $target['phase'] + $phaseOffset,
            'adjustment_count' => $adjustmentCount,
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

    public function test_signal_tune_completion_rejects_replay(): void
    {
        $attempt = $this->attempt();
        $target = $this->targetFor((string) $attempt->getKey());
        $url = $this->completionUrl($attempt);

        $payload = [
            'elapsed_ms' => 4200,
            'amplitude' => $target['amplitude'],
            'frequency' => $target['frequency'],
            'phase' => $target['phase'],
            'adjustment_count' => 9,
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

    public function test_signal_tune_completion_rejects_expired_attempt(): void
    {
        $attempt = $this->attempt();
        $target = $this->targetFor((string) $attempt->getKey());
        $attempt->forceFill(['expires_at' => now()->subMinute()])->save();

        $this->post($this->completionUrl($attempt, now()->addMinute()), [
            'elapsed_ms' => 4200,
            'amplitude' => $target['amplitude'],
            'frequency' => $target['frequency'],
            'phase' => $target['phase'],
            'adjustment_count' => 9,
            'input_mode' => 'pointer',
        ])->assertRedirect('https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback?status=failed');

        $this->assertDatabaseHas('ctx_challenge_attempts', [
            'id' => $attempt->getKey(),
            'status' => 'pending',
            'challenge_score' => null,
        ]);
    }

    /** @return iterable<string, array{string, int, int, int, int, int, string, int, list<string>}> */
    public static function completionCases(): iterable
    {
        yield 'normal pointer exact lock' => [
            'normal pointer exact lock',
            4200,
            0,
            0,
            0,
            9,
            'pointer',
            100,
            ['pointer'],
        ];
        yield 'keyboard near lock' => [
            'keyboard near lock',
            5200,
            5,
            -6,
            14,
            11,
            'keyboard',
            87,
            ['keyboard'],
        ];
        yield 'impossible fast exact lock' => [
            'impossible fast exact lock',
            900,
            0,
            0,
            0,
            9,
            'pointer',
            20,
            ['pointer', 'too_fast', 'not_locked'],
        ];
        yield 'too few adjustments exact lock' => [
            'too few adjustments exact lock',
            4200,
            0,
            0,
            0,
            1,
            'pointer',
            45,
            ['pointer', 'too_few_adjustments', 'not_locked'],
        ];
        yield 'weak tune' => [
            'weak tune',
            4200,
            18,
            -20,
            34,
            12,
            'touch',
            60,
            ['touch', 'not_locked'],
        ];
    }

    private function attempt(): CtxChallengeAttempt
    {
        [$user, $device] = $this->identity();
        $now = now();
        $attempt = CtxChallengeAttempt::query()->create([
            'id' => '019f00b0-0000-7000-8000-000000000001',
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
            'challenge_id' => 'signal_tune',
            'module_version' => '1.0.0',
            'lifecycle_state' => 'draft',
            'input_modes' => ['pointer', 'touch', 'keyboard', 'reduced_motion'],
            'event_schema_version' => '1.0.0',
            'scoring_adapter' => 'signal_tune',
            'scoring_adapter_version' => '1.0.0',
            'selection_weight' => 1,
        ]);

        return $attempt->refresh()->load('modules');
    }

    private function completionUrl(CtxChallengeAttempt $attempt, mixed $expires = null): string
    {
        return URL::temporarySignedRoute(
            'ctx.challenge-attempts.signal-tune.complete',
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

    /** @return array{amplitude: int, frequency: int, phase: int} */
    private function targetFor(string $seed): array
    {
        $hash = abs(crc32($seed));

        return [
            'amplitude' => 24 + ($hash % 35),
            'frequency' => 22 + (($hash >> 5) % 39),
            'phase' => (($hash >> 11) % 101) - 50,
        ];
    }

    /** @return array{User, ViewerDevice} */
    private function identity(): array
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $device = ViewerDevice::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'name' => 'Signal Tune calibration Viewer',
            'proof_public_key' => str_repeat('p', 43),
            'proof_jkt' => str_repeat('j', 43),
            'agreement_public_key' => str_repeat('a', 43),
            'agreement_jkt' => str_repeat('k', 43),
            'status' => ViewerDeviceStatus::Active,
        ]);

        return [$user, $device];
    }
}
