<?php

namespace Tests\Feature\Ctx;

use App\Models\CtxChallengeAttempt;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Tests\TestCase;

final class ChallengePlaygroundTest extends TestCase
{
    use RefreshDatabase;

    public function test_playground_starts_fresh_attempts_with_stable_per_attempt_seed(): void
    {
        $this->identity();

        $first = $this->get(route('ctx.challenge-playground.circuit-trace'))
            ->assertRedirect();
        $firstUrl = $first->headers->get('Location');
        $this->assertIsString($firstUrl);
        $firstAttemptId = $this->attemptIdFromUrl($firstUrl);

        $this->get($firstUrl)
            ->assertOk()
            ->assertSee('data-seed="'.$firstAttemptId.'"', false);
        $this->get($firstUrl)
            ->assertOk()
            ->assertSee('data-seed="'.$firstAttemptId.'"', false);

        $second = $this->get(route('ctx.challenge-playground.circuit-trace'))
            ->assertRedirect();
        $secondUrl = $second->headers->get('Location');
        $this->assertIsString($secondUrl);

        $this->assertNotSame($firstAttemptId, $this->attemptIdFromUrl($secondUrl));
        $this->assertDatabaseCount('ctx_challenge_attempts', 2);
    }

    public function test_playground_result_displays_score_and_restarts_with_fresh_attempt(): void
    {
        $this->identity();

        $this->get(route('ctx.challenge-playground.circuit-trace', [
            'status' => 'completed',
            'score' => 84,
        ]))
            ->assertOk()
            ->assertSee('Challenge complete')
            ->assertSee('<div class="score">84</div>', false)
            ->assertSee('Starting the next check in <span data-countdown>5</span> seconds.', false)
            ->assertSee('Start next check');

        $restart = $this->get(route('ctx.challenge-playground.circuit-trace'))
            ->assertRedirect();
        $restartUrl = $restart->headers->get('Location');
        $this->assertIsString($restartUrl);
        $this->assertStringContainsString('/ctx/challenge-attempts/', $restartUrl);
        $this->assertDatabaseCount('ctx_challenge_attempts', 1);
    }

    public function test_expired_playground_signed_links_recover_to_fresh_playground(): void
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
            'payload_id' => 'playground',
            'release_handle' => 'challenge-playground-release-handle',
            'action' => 'render',
            'challenge_set_version' => 'ctx-challenge-set-test',
            'selector_version' => 'ctx-challenge-selector-test',
            'scoring_model_version' => 'ctx-challenge-scoring-test',
            'status' => 'pending',
            'issued_at' => now()->subMinutes(20),
            'expires_at' => now()->subMinutes(10),
        ]);

        $expiredUrl = URL::temporarySignedRoute(
            'ctx.challenge-attempts.show',
            now()->subMinute(),
            [
                'attempt' => $attempt->getKey(),
                'return_to' => 'http://localhost:3003/ctx/challenge-playground/circuit-trace',
            ],
        );

        $this->get($expiredUrl)
            ->assertRedirect(route('ctx.challenge-playground.circuit-trace'));
    }

    /** @return array{User, ViewerDevice} */
    private function identity(): array
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $device = ViewerDevice::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'name' => 'Challenge playground Viewer',
            'proof_public_key' => str_repeat('p', 43),
            'proof_jkt' => str_repeat('j', 43),
            'agreement_public_key' => str_repeat('a', 43),
            'agreement_jkt' => str_repeat('k', 43),
            'status' => ViewerDeviceStatus::Active,
        ]);

        return [$user, $device];
    }

    private function attemptIdFromUrl(string $url): string
    {
        preg_match('~/ctx/challenge-attempts/([^?]+)~', $url, $matches);
        $this->assertArrayHasKey(1, $matches);

        return $matches[1];
    }
}
