<?php

namespace Tests\Unit\Ctx;

use App\Ctx\Challenges\ChallengeAttemptContext;
use App\Ctx\Challenges\ChallengeAttemptFailed;
use App\Ctx\Challenges\ChallengeAttemptOrchestrator;
use App\Ctx\Challenges\ChallengeModuleDefinition;
use App\Ctx\Challenges\ChallengeModuleStatus;
use App\Ctx\Challenges\ChallengeRegistry;
use App\Ctx\Challenges\DatabaseChallengeEvidenceRepository;
use App\Models\CtxChallengeAttempt;
use App\Models\CtxChallengeCadence;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

final class ChallengeAttemptOrchestratorTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();

        parent::tearDown();
    }

    public function test_it_records_the_selected_registry_modules_and_versions(): void
    {
        [$user, $device] = $this->identity();

        $attempt = $this->orchestrator()->create($user, $device, $this->context());

        $this->assertSame('pending', $attempt->status);
        $this->assertSame('ctx-challenge-set-test', $attempt->challenge_set_version);
        $this->assertSame('ctx-challenge-selector-test', $attempt->selector_version);
        $this->assertSame('ctx-challenge-scoring-test', $attempt->scoring_model_version);
        $this->assertSame('https://host.example.test', $attempt->host_origin);
        $this->assertSame(ChallengeAttemptOrchestrator::RETENTION_PURPOSE, $attempt->retention_purpose);
        $this->assertTrue($attempt->expires_at->equalTo($attempt->issued_at->addMinutes(ChallengeAttemptOrchestrator::ATTEMPT_LIFETIME_MINUTES)));
        $this->assertTrue($attempt->evidence_retained_until->equalTo($attempt->expires_at->addHours(ChallengeAttemptOrchestrator::RETENTION_AFTER_EXPIRY_HOURS)));
        $this->assertCount(4, $attempt->modules);
        foreach ($attempt->modules as $module) {
            $this->assertContains($module->challenge_id, [
                'circuit_trace',
                'signal_tune',
                'cargo_sort',
                'memory_path',
                'balance_beam',
            ]);
            $this->assertSame('1.0.0', $module->module_version);
            $this->assertSame(ChallengeModuleStatus::Active->value, $module->lifecycle_state);
            $this->assertSame(['pointer', 'keyboard'], $module->input_modes);
            $this->assertSame('test-adapter', $module->scoring_adapter);
            $this->assertNull($module->score);
        }
    }

    public function test_it_averages_completed_module_scores_into_the_attempt_score(): void
    {
        [$user, $device] = $this->identity();
        $orchestrator = $this->orchestrator();
        $attempt = $orchestrator->create($user, $device, $this->context());
        $modules = $attempt->modules->values();

        $partial = $orchestrator->recordModuleScore($attempt, $modules[0]->challenge_id, 80, ['completed']);
        $this->assertSame('pending', $partial->status);
        $this->assertNull($partial->challenge_score);

        $orchestrator->recordModuleScore($attempt, $modules[1]->challenge_id, 60, ['completed']);
        $orchestrator->recordModuleScore($attempt, $modules[2]->challenge_id, 100, ['completed']);
        $completed = $orchestrator->recordModuleScore($attempt, $modules[3]->challenge_id, 80, ['completed']);

        $this->assertSame('completed', $completed->status);
        $this->assertSame(80, $completed->challenge_score);
        $this->assertNotNull($completed->completed_at);
    }

    public function test_it_rejects_replayed_unknown_expired_or_out_of_range_module_scores(): void
    {
        [$user, $device] = $this->identity();
        $orchestrator = $this->orchestrator();
        $attempt = $orchestrator->create($user, $device, $this->context());
        $module = $attempt->modules->firstOrFail();

        $this->expectException(\InvalidArgumentException::class);
        $orchestrator->recordModuleScore($attempt, $module->challenge_id, 101);
    }

    public function test_it_rejects_replayed_unknown_and_expired_module_scores(): void
    {
        [$user, $device] = $this->identity();
        $orchestrator = $this->orchestrator();
        $attempt = $orchestrator->create($user, $device, $this->context());
        $module = $attempt->modules->firstOrFail();

        $orchestrator->recordModuleScore($attempt, $module->challenge_id, 80);

        $this->expectException(ChallengeAttemptFailed::class);
        $orchestrator->recordModuleScore($attempt, $module->challenge_id, 80);
    }

    public function test_it_rejects_expired_attempts_before_scoring(): void
    {
        [$user, $device] = $this->identity();
        $orchestrator = $this->orchestrator();
        $attempt = $orchestrator->create($user, $device, $this->context());
        $module = $attempt->modules->firstOrFail();
        $attempt->forceFill(['expires_at' => now()->subSecond()])->save();

        $this->expectException(ChallengeAttemptFailed::class);
        $orchestrator->recordModuleScore($attempt, $module->challenge_id, 80);
    }

    public function test_challenge_tables_retain_only_reviewed_metadata(): void
    {
        $this->assertEqualsCanonicalizing([
            'id',
            'user_id',
            'viewer_device_id',
            'host_origin',
            'broker',
            'capsule_id',
            'capsule_revision',
            'policy_sha256',
            'payload_id',
            'release_handle',
            'action',
            'challenge_set_version',
            'selector_version',
            'scoring_model_version',
            'status',
            'challenge_score',
            'issued_at',
            'expires_at',
            'retention_purpose',
            'evidence_retained_until',
            'completed_at',
            'created_at',
            'updated_at',
        ], Schema::getColumnListing('ctx_challenge_attempts'));

        $this->assertEqualsCanonicalizing([
            'id',
            'ctx_challenge_attempt_id',
            'challenge_id',
            'module_version',
            'lifecycle_state',
            'input_modes',
            'event_schema_version',
            'scoring_adapter',
            'scoring_adapter_version',
            'selection_weight',
            'score',
            'reason_categories',
            'interaction_summary',
            'completed_at',
            'created_at',
            'updated_at',
        ], Schema::getColumnListing('ctx_challenge_attempt_modules'));
    }

    public function test_module_scores_store_only_bounded_scalar_interaction_summaries(): void
    {
        [$user, $device] = $this->identity();
        $orchestrator = $this->orchestrator();
        $attempt = $orchestrator->create($user, $device, $this->context());
        $module = $attempt->modules->firstOrFail();

        $completed = $orchestrator->recordModuleScore($attempt, $module->challenge_id, 80, ['completed'], [
            'elapsed_ms' => 30000,
            'correct_count' => 4,
            'mistake_count' => 1,
            'input_mode' => 'pointer',
        ]);

        $summary = $completed->modules->firstOrFail()->interaction_summary;
        $this->assertEquals([
            'elapsed_ms' => 30000,
            'correct_count' => 4,
            'mistake_count' => 1,
            'input_mode' => 'pointer',
        ], $summary);
    }

    public function test_module_score_rejects_raw_interaction_summary_shapes(): void
    {
        [$user, $device] = $this->identity();
        $orchestrator = $this->orchestrator();
        $attempt = $orchestrator->create($user, $device, $this->context());
        $module = $attempt->modules->firstOrFail();

        $this->expectException(\InvalidArgumentException::class);
        $orchestrator->recordModuleScore($attempt, $module->challenge_id, 80, ['completed'], [
            'raw_pointer_trace' => [[12, 24], [13, 25]],
        ]);
    }

    public function test_expired_challenge_attempts_are_prunable_after_the_reviewed_retention_window(): void
    {
        [$user, $device] = $this->identity();
        $attempt = $this->orchestrator()->create($user, $device, $this->context());
        $now = CarbonImmutable::now();

        $attempt->forceFill([
            'expires_at' => $now->subHours(23),
            'evidence_retained_until' => $now->addHour(),
        ])->save();
        $this->assertFalse($attempt->fresh()->prunable()->whereKey($attempt->getKey())->exists());

        $attempt->forceFill(['evidence_retained_until' => $now->subSecond()])->save();
        $this->assertTrue($attempt->fresh()->prunable()->whereKey($attempt->getKey())->exists());
    }

    public function test_successful_completion_creates_standard_challenge_cadence_evidence(): void
    {
        [$user, $device] = $this->identity();
        $context = $this->context();
        $now = CarbonImmutable::parse('2026-06-25T12:00:00Z');
        CarbonImmutable::setTestNow($now);
        $orchestrator = $this->orchestrator();
        $attempt = $orchestrator->create($user, $device, $context);

        $completed = $this->completeAttempt($orchestrator, $attempt, [80, 80, 80, 80], $now);

        $cadence = CtxChallengeCadence::query()->sole();
        $this->assertSame(CtxChallengeCadence::scopeKey($user, $device, $context), $cadence->scope_sha256);
        $this->assertSame('completed', $completed->status);
        $this->assertSame(80, $completed->challenge_score);
        $this->assertSame(1, $cadence->challenge_success_streak);
        $this->assertSame(ChallengeAttemptOrchestrator::CADENCE_TIER_STANDARD, $cadence->challenge_refresh_tier);
        $this->assertSame(80, $cadence->last_challenge_score);
        $this->assertTrue($cadence->last_challenged_at->equalTo($now));
        $this->assertTrue($cadence->challenge_expires_at->equalTo($now->addDays(ChallengeAttemptOrchestrator::STANDARD_VALIDITY_DAYS)));
        $this->assertNull($cadence->last_reset_reason);

        $evidence = (new DatabaseChallengeEvidenceRepository)->currentFor(
            $user,
            $device,
            $context,
            $now->addDays(6),
        );
        $this->assertNotNull($evidence);
        $this->assertSame(80, $evidence->score->value);
        $this->assertTrue($evidence->expiresAt->equalTo($now->addDays(ChallengeAttemptOrchestrator::STANDARD_VALIDITY_DAYS)));

        $this->assertNull((new DatabaseChallengeEvidenceRepository)->currentFor(
            $user,
            $device,
            $context,
            $now->addDays(8),
        ));
    }

    public function test_five_clean_successful_challenge_windows_extend_the_refresh_cadence(): void
    {
        [$user, $device] = $this->identity();
        $context = $this->context();
        $startedAt = CarbonImmutable::parse('2026-06-25T12:00:00Z');
        $orchestrator = $this->orchestrator();

        for ($index = 0; $index < ChallengeAttemptOrchestrator::EXTENDED_SUCCESS_STREAK; $index++) {
            $now = $startedAt->addDays($index);
            CarbonImmutable::setTestNow($now);
            $attempt = $orchestrator->create($user, $device, $context);
            $this->completeAttempt($orchestrator, $attempt, [90, 90, 90, 90], $now);
        }

        $finalChallengeAt = $startedAt->addDays(ChallengeAttemptOrchestrator::EXTENDED_SUCCESS_STREAK - 1);
        $cadence = CtxChallengeCadence::query()->sole();
        $this->assertSame(ChallengeAttemptOrchestrator::EXTENDED_SUCCESS_STREAK, $cadence->challenge_success_streak);
        $this->assertSame(ChallengeAttemptOrchestrator::CADENCE_TIER_EXTENDED, $cadence->challenge_refresh_tier);
        $this->assertSame(90, $cadence->last_challenge_score);
        $this->assertTrue($cadence->challenge_expires_at->equalTo($finalChallengeAt->addDays(ChallengeAttemptOrchestrator::EXTENDED_VALIDITY_DAYS)));
    }

    public function test_low_challenge_score_resets_cadence_to_standard_and_not_current(): void
    {
        [$user, $device] = $this->identity();
        $context = $this->context();
        $orchestrator = $this->orchestrator();
        $first = CarbonImmutable::parse('2026-06-25T12:00:00Z');
        CarbonImmutable::setTestNow($first);
        $this->completeAttempt($orchestrator, $orchestrator->create($user, $device, $context), [80, 80, 80, 80], $first);

        $second = $first->addDay();
        CarbonImmutable::setTestNow($second);
        $this->completeAttempt($orchestrator, $orchestrator->create($user, $device, $context), [40, 40, 40, 40], $second);

        $cadence = CtxChallengeCadence::query()->sole();
        $this->assertSame(0, $cadence->challenge_success_streak);
        $this->assertSame(ChallengeAttemptOrchestrator::CADENCE_TIER_STANDARD, $cadence->challenge_refresh_tier);
        $this->assertSame(40, $cadence->last_challenge_score);
        $this->assertTrue($cadence->challenge_expires_at->equalTo($second));
        $this->assertSame(ChallengeAttemptOrchestrator::RESET_REASON_LOW_CHALLENGE_SCORE, $cadence->last_reset_reason);
        $this->assertNull((new DatabaseChallengeEvidenceRepository)->currentFor($user, $device, $context, $second));
    }

    public function test_high_automation_risk_reset_clears_current_cadence_evidence(): void
    {
        [$user, $device] = $this->identity();
        $context = $this->context();
        $now = CarbonImmutable::parse('2026-06-25T12:00:00Z');
        CarbonImmutable::setTestNow($now);
        $orchestrator = $this->orchestrator();
        $this->completeAttempt($orchestrator, $orchestrator->create($user, $device, $context), [80, 80, 80, 80], $now);

        (new DatabaseChallengeEvidenceRepository)->resetFor($user, $device, $context, 'high_automation_risk', $now->addHour());

        $cadence = CtxChallengeCadence::query()->sole();
        $this->assertSame(0, $cadence->challenge_success_streak);
        $this->assertSame(ChallengeAttemptOrchestrator::CADENCE_TIER_STANDARD, $cadence->challenge_refresh_tier);
        $this->assertTrue($cadence->challenge_expires_at->equalTo($now->addHour()));
        $this->assertSame('high_automation_risk', $cadence->last_reset_reason);
        $this->assertNull((new DatabaseChallengeEvidenceRepository)->currentFor($user, $device, $context, $now->addHours(2)));
    }

    private function orchestrator(): ChallengeAttemptOrchestrator
    {
        return new ChallengeAttemptOrchestrator(new class implements ChallengeRegistry
        {
            public function challengeSetVersion(): string
            {
                return 'ctx-challenge-set-test';
            }

            public function selectorVersion(): string
            {
                return 'ctx-challenge-selector-test';
            }

            public function scoringModelVersion(): string
            {
                return 'ctx-challenge-scoring-test';
            }

            public function requiredModuleCount(): int
            {
                return 4;
            }

            public function activeModules(): array
            {
                return array_map(
                    fn (string $id): ChallengeModuleDefinition => new ChallengeModuleDefinition(
                        id: $id,
                        version: '1.0.0',
                        status: ChallengeModuleStatus::Active,
                        inputModes: ['pointer', 'keyboard'],
                        eventSchemaVersion: '1.0.0',
                        scoringAdapter: 'test-adapter',
                        scoringAdapterVersion: '1.0.0',
                    ),
                    ['circuit_trace', 'signal_tune', 'cargo_sort', 'memory_path', 'balance_beam'],
                );
            }
        });
    }

    private function context(): ChallengeAttemptContext
    {
        return new ChallengeAttemptContext(
            hostOrigin: 'https://host.example.test',
            broker: 'https://broker.example.test',
            capsuleId: 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            capsuleRevision: 1,
            policySha256: str_repeat('a', 43),
            payloadId: 'primary-image',
            releaseHandle: 'opaque-release-handle-0001',
            action: 'render',
        );
    }

    /**
     * @param  list<int>  $scores
     */
    private function completeAttempt(
        ChallengeAttemptOrchestrator $orchestrator,
        CtxChallengeAttempt $attempt,
        array $scores,
        CarbonImmutable $now,
    ): CtxChallengeAttempt {
        $completed = $attempt;
        foreach ($attempt->modules->values() as $index => $module) {
            $completed = $orchestrator->recordModuleScore(
                $attempt,
                $module->challenge_id,
                $scores[$index] ?? $scores[array_key_last($scores)],
                ['completed'],
                [],
                $now,
            );
        }

        return $completed;
    }

    /** @return array{User, ViewerDevice} */
    private function identity(): array
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $device = ViewerDevice::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'name' => 'Challenge test Viewer',
            'proof_public_key' => str_repeat('p', 43),
            'proof_jkt' => str_repeat('j', 43),
            'agreement_public_key' => str_repeat('a', 43),
            'agreement_jkt' => str_repeat('k', 43),
            'status' => ViewerDeviceStatus::Active,
        ]);

        return [$user, $device];
    }
}
