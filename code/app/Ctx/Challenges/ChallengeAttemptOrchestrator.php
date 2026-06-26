<?php

namespace App\Ctx\Challenges;

use App\Models\CtxChallengeAttempt;
use App\Models\CtxChallengeAttemptModule;
use App\Models\CtxChallengeCadence;
use App\Models\User;
use App\Models\ViewerDevice;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

final readonly class ChallengeAttemptOrchestrator
{
    public const ATTEMPT_LIFETIME_MINUTES = 10;

    public const RETENTION_AFTER_EXPIRY_HOURS = 24;

    public const RETENTION_PURPOSE = 'trust_capsule_challenge_evidence';

    public const PASSING_SCORE = 70;

    public const STANDARD_VALIDITY_DAYS = 7;

    public const EXTENDED_VALIDITY_DAYS = 30;

    public const EXTENDED_SUCCESS_STREAK = 5;

    public const CADENCE_TIER_STANDARD = 'standard';

    public const CADENCE_TIER_EXTENDED = 'extended';

    public const RESET_REASON_LOW_CHALLENGE_SCORE = 'low_challenge_score';

    public function __construct(private ChallengeRegistry $registry) {}

    public function create(User $user, ViewerDevice $device, ChallengeAttemptContext $context): CtxChallengeAttempt
    {
        $modules = $this->selectModules();
        $now = CarbonImmutable::now();
        $expiresAt = $now->addMinutes(self::ATTEMPT_LIFETIME_MINUTES);

        return DB::transaction(function () use ($user, $device, $context, $modules, $now, $expiresAt): CtxChallengeAttempt {
            $attempt = CtxChallengeAttempt::query()->create([
                'user_id' => $user->getKey(),
                'viewer_device_id' => $device->getKey(),
                'host_origin' => $context->hostOrigin,
                'broker' => $context->broker,
                'capsule_id' => $context->capsuleId,
                'capsule_revision' => $context->capsuleRevision,
                'policy_sha256' => $context->policySha256,
                'payload_id' => $context->payloadId,
                'release_handle' => $context->releaseHandle,
                'action' => $context->action,
                'challenge_set_version' => $this->registry->challengeSetVersion(),
                'selector_version' => $this->registry->selectorVersion(),
                'scoring_model_version' => $this->registry->scoringModelVersion(),
                'status' => 'pending',
                'issued_at' => $now,
                'expires_at' => $expiresAt,
                'retention_purpose' => self::RETENTION_PURPOSE,
                'evidence_retained_until' => $expiresAt->addHours(self::RETENTION_AFTER_EXPIRY_HOURS),
            ]);

            foreach ($modules as $module) {
                $attempt->modules()->create([
                    'challenge_id' => $module->id,
                    'module_version' => $module->version,
                    'lifecycle_state' => $module->status->value,
                    'input_modes' => $module->inputModes,
                    'event_schema_version' => $module->eventSchemaVersion,
                    'scoring_adapter' => $module->scoringAdapter,
                    'scoring_adapter_version' => $module->scoringAdapterVersion,
                    'selection_weight' => $module->selectionWeight,
                ]);
            }

            return $attempt->refresh()->load('modules');
        });
    }

    /**
     * @param  list<string>  $reasonCategories
     * @param  array<string, int|string|bool|null>  $interactionSummary
     */
    public function recordModuleScore(
        CtxChallengeAttempt $attempt,
        string $challengeId,
        int $score,
        array $reasonCategories = [],
        array $interactionSummary = [],
        ?CarbonImmutable $now = null,
    ): CtxChallengeAttempt {
        if ($score < 0 || $score > 100) {
            throw new InvalidArgumentException('Challenge module scores must be between 0 and 100.');
        }
        $this->assertSafeInteractionSummary($interactionSummary);

        $now ??= CarbonImmutable::now();

        return DB::transaction(function () use ($attempt, $challengeId, $score, $reasonCategories, $interactionSummary, $now): CtxChallengeAttempt {
            $locked = CtxChallengeAttempt::query()->lockForUpdate()->findOrFail($attempt->getKey());
            if ($locked->status !== 'pending' || ! $locked->expires_at->greaterThan($now)) {
                throw new ChallengeAttemptFailed('The challenge attempt is not active.');
            }

            $module = CtxChallengeAttemptModule::query()
                ->where('ctx_challenge_attempt_id', $locked->getKey())
                ->where('challenge_id', $challengeId)
                ->lockForUpdate()
                ->first();
            if (! $module instanceof CtxChallengeAttemptModule) {
                throw new ChallengeAttemptFailed('The challenge module is not part of this attempt.');
            }
            if ($module->completed_at !== null) {
                throw new ChallengeAttemptFailed('The challenge module has already been completed.');
            }

            $module->forceFill([
                'score' => $score,
                'reason_categories' => $reasonCategories,
                'interaction_summary' => $interactionSummary === [] ? null : $interactionSummary,
                'completed_at' => $now,
            ])->save();

            $remaining = CtxChallengeAttemptModule::query()
                ->where('ctx_challenge_attempt_id', $locked->getKey())
                ->whereNull('completed_at')
                ->count();

            if ($remaining === 0) {
                $average = (int) round(CtxChallengeAttemptModule::query()
                    ->where('ctx_challenge_attempt_id', $locked->getKey())
                    ->avg('score'));
                $locked->forceFill([
                    'status' => 'completed',
                    'challenge_score' => $average,
                    'completed_at' => $now,
                ])->save();
                $this->recordCadence($locked, $average, $now);
            }

            return $locked->refresh()->load('modules');
        });
    }

    private function recordCadence(CtxChallengeAttempt $attempt, int $score, CarbonImmutable $now): void
    {
        $user = User::query()->findOrFail($attempt->user_id);
        $device = ViewerDevice::query()->findOrFail($attempt->viewer_device_id);
        $context = new ChallengeAttemptContext(
            hostOrigin: $attempt->host_origin,
            broker: $attempt->broker,
            capsuleId: $attempt->capsule_id,
            capsuleRevision: $attempt->capsule_revision,
            policySha256: $attempt->policy_sha256,
            payloadId: $attempt->payload_id,
            releaseHandle: $attempt->release_handle,
            action: $attempt->action,
        );
        $scopeKey = CtxChallengeCadence::scopeKey($user, $device, $context);
        $cadence = CtxChallengeCadence::query()
            ->where('scope_sha256', $scopeKey)
            ->lockForUpdate()
            ->first();

        if (! $cadence instanceof CtxChallengeCadence) {
            $cadence = new CtxChallengeCadence([
                'scope_sha256' => $scopeKey,
                'user_id' => $attempt->user_id,
                'viewer_device_id' => $attempt->viewer_device_id,
                'host_origin' => $attempt->host_origin,
                'broker' => $attempt->broker,
                'capsule_id' => $attempt->capsule_id,
                'capsule_revision' => $attempt->capsule_revision,
                'policy_sha256' => $attempt->policy_sha256,
                'payload_id' => $attempt->payload_id,
                'release_handle' => $attempt->release_handle,
                'action' => $attempt->action,
            ]);
        }

        $previousExpiry = $cadence->challenge_expires_at;
        $baseStreak = $previousExpiry !== null && $previousExpiry->greaterThanOrEqualTo($now)
            ? (int) $cadence->challenge_success_streak
            : 0;

        if ($score < self::PASSING_SCORE) {
            $cadence->forceFill([
                'challenge_success_streak' => 0,
                'challenge_refresh_tier' => self::CADENCE_TIER_STANDARD,
                'last_challenge_score' => $score,
                'last_challenged_at' => $now,
                'challenge_expires_at' => $now,
                'last_reset_reason' => self::RESET_REASON_LOW_CHALLENGE_SCORE,
            ])->save();

            return;
        }

        $streak = min(self::EXTENDED_SUCCESS_STREAK, $baseStreak + 1);
        $extended = $streak >= self::EXTENDED_SUCCESS_STREAK;

        $cadence->forceFill([
            'challenge_success_streak' => $streak,
            'challenge_refresh_tier' => $extended ? self::CADENCE_TIER_EXTENDED : self::CADENCE_TIER_STANDARD,
            'last_challenge_score' => $score,
            'last_challenged_at' => $now,
            'challenge_expires_at' => $extended
                ? $now->addDays(self::EXTENDED_VALIDITY_DAYS)
                : $now->addDays(self::STANDARD_VALIDITY_DAYS),
            'last_reset_reason' => null,
        ])->save();
    }

    /** @param array<string, mixed> $interactionSummary */
    private function assertSafeInteractionSummary(array $interactionSummary): void
    {
        if (count($interactionSummary) > 24) {
            throw new InvalidArgumentException('Challenge interaction summaries must remain bounded.');
        }

        foreach ($interactionSummary as $key => $value) {
            if (preg_match('/\A[a-z][a-z0-9_]{0,63}\z/', (string) $key) !== 1) {
                throw new InvalidArgumentException('Challenge interaction summary keys must be stable counters.');
            }
            if (! is_int($value) && ! is_string($value) && ! is_bool($value) && $value !== null) {
                throw new InvalidArgumentException('Challenge interaction summaries may only contain scalar derived values.');
            }
            if (is_string($value) && strlen($value) > 64) {
                throw new InvalidArgumentException('Challenge interaction summary values must remain bounded.');
            }
        }
    }

    /** @return list<ChallengeModuleDefinition> */
    private function selectModules(): array
    {
        $modules = $this->registry->activeModules();
        $required = $this->registry->requiredModuleCount();
        if ($required < 1 || count($modules) < $required) {
            throw new ChallengeAttemptFailed('Not enough active challenge modules are configured.');
        }

        $pool = array_values($modules);
        for ($index = count($pool) - 1; $index > 0; $index--) {
            $swap = random_int(0, $index);
            [$pool[$index], $pool[$swap]] = [$pool[$swap], $pool[$index]];
        }

        return array_slice($pool, 0, $required);
    }
}
