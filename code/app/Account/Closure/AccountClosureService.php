<?php

namespace App\Account\Closure;

use App\Account\Sessions\AccountSessionService;
use App\Broker\Lifecycle\BrokerContentKeyLifecycle;
use App\Ctx\Metrics\CtxMetricEvent;
use App\Ctx\Metrics\CtxMetricEventType;
use App\Ctx\Metrics\CtxMetricRecorder;
use App\Ctx\Metrics\MetricEventIdentifierSource;
use App\Models\User;
use App\Models\ViewerDeviceChallenge;
use App\Notifications\AccountClosureStarted;
use App\Notifications\AccountRestored;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Passport\Passport;
use Throwable;

final readonly class AccountClosureService
{
    public function __construct(
        private AccountSessionService $sessions,
        private BrokerContentKeyLifecycle $broker,
        private CtxMetricRecorder $metrics,
        private MetricEventIdentifierSource $metricIdentifiers,
    ) {}

    public function close(User $user): void
    {
        $recoveryToken = Str::random(64);

        $closed = DB::transaction(function () use ($user, $recoveryToken): bool {
            /** @var User $lockedUser */
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->getKey());

            if ($lockedUser->isClosed()) {
                return false;
            }

            $lockedUser->forceFill([
                'closed_at' => now(),
                'deletion_due_at' => now()->addDays(
                    (int) config('accounts.closure.recovery_days'),
                ),
                'closure_recovery_token_hash' => hash('sha256', $recoveryToken),
            ])->save();

            $lockedUser->viewerDevices()
                ->where('status', ViewerDeviceStatus::Active)
                ->update([
                    'status' => ViewerDeviceStatus::Suspended,
                    'suspended_at' => now(),
                ]);
            ViewerDeviceChallenge::query()->where('user_id', $lockedUser->getKey())->delete();
            $this->revokeOAuthCredentials($lockedUser);
            $user->setRawAttributes($lockedUser->getAttributes(), true);

            return true;
        });

        if (! $closed) {
            return;
        }

        $this->sessions->revokeAll($user);
        try {
            $this->broker->pauseCreator((int) $user->getKey());
        } catch (Throwable $exception) {
            report($exception);
        }
        try {
            $this->recordReleasePause($user);
        } catch (Throwable $exception) {
            report($exception);
        }
        $user->notify(new AccountClosureStarted($recoveryToken));
    }

    public function sendRecoveryLink(string $email): void
    {
        /** @var User|null $user */
        $user = User::query()->where('email', mb_strtolower(trim($email)))->first();

        if (! $user instanceof User || ! $user->isRecoverable()) {
            return;
        }

        $recoveryToken = Str::random(64);
        $user->forceFill([
            'closure_recovery_token_hash' => hash('sha256', $recoveryToken),
        ])->save();
        $user->notify(new AccountClosureStarted($recoveryToken));
    }

    public function canRecover(User $user, string $recoveryToken): bool
    {
        return $user->isRecoverable()
            && is_string($user->closure_recovery_token_hash)
            && hash_equals(
                $user->closure_recovery_token_hash,
                hash('sha256', $recoveryToken),
            );
    }

    public function restore(User $user, string $recoveryToken): bool
    {
        $restored = DB::transaction(function () use ($user, $recoveryToken): bool {
            /** @var User $lockedUser */
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->getKey());

            if (! $this->canRecover($lockedUser, $recoveryToken)) {
                return false;
            }

            $this->broker->resumeCreator((int) $lockedUser->getKey());
            $lockedUser->forceFill([
                'closed_at' => null,
                'deletion_due_at' => null,
                'closure_recovery_token_hash' => null,
                'last_restored_at' => now(),
            ])->save();
            $user->setRawAttributes($lockedUser->getAttributes(), true);

            return true;
        });

        if ($restored) {
            $user->notify(new AccountRestored);
        }

        return $restored;
    }

    private function recordReleasePause(User $user): void
    {
        foreach ($user->brokerRegistrationGrants()
            ->select(['capsule_id', 'capsule_revision'])
            ->distinct()
            ->get() as $grant) {
            $this->metrics->record(new CtxMetricEvent(
                eventId: $this->metricIdentifiers->identifier(),
                type: CtxMetricEventType::ReleasePaused,
                provider: (string) config('sharecapsules.ctx.issuer'),
                broker: (string) config('sharecapsules.broker.base_url'),
                capsuleId: $grant->capsule_id,
                capsuleRevision: $grant->capsule_revision,
                occurredAt: $user->closed_at->toImmutable(),
            ));
        }
    }

    private function revokeOAuthCredentials(User $user): void
    {
        $accessTokenIds = Passport::token()->newQuery()
            ->where('user_id', $user->getKey())
            ->pluck('id');

        Passport::refreshToken()->newQuery()
            ->whereIn('access_token_id', $accessTokenIds)
            ->update(['revoked' => true]);
        Passport::token()->newQuery()
            ->whereIn('id', $accessTokenIds)
            ->update(['revoked' => true]);
        Passport::authCode()->newQuery()
            ->where('user_id', $user->getKey())
            ->update(['revoked' => true]);
    }
}
