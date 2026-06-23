<?php

namespace App\Broker\Lifecycle;

use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Capsules\Registry\CapsuleRegistryConflict;
use App\Ctx\Metrics\CtxMetricEvent;
use App\Ctx\Metrics\CtxMetricEventType;
use App\Ctx\Metrics\CtxMetricRecorder;
use App\Models\CreatorCapsule;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Throwable;

final readonly class CapsuleRevocationService
{
    public function __construct(
        private BrokerContentKeyLifecycle $broker,
        private CtxMetricRecorder $metrics,
    ) {}

    public function revoke(User $creator, string $capsuleId, int $capsuleRevision): void
    {
        $now = CarbonImmutable::now();
        $capsule = DB::transaction(function () use ($creator, $capsuleId, $capsuleRevision, $now): CreatorCapsule {
            $record = CreatorCapsule::query()->where('user_id', $creator->getKey())
                ->where('capsule_id', $capsuleId)->where('capsule_revision', $capsuleRevision)
                ->lockForUpdate()->firstOrFail();
            if ($record->status === CapsuleLifecycleStatus::Active) {
                $record->transitionTo(CapsuleLifecycleStatus::RevocationPending);
                $record->forceFill(['revocation_requested_at' => $now])->save();
            }
            if (! in_array($record->status, [CapsuleLifecycleStatus::RevocationPending, CapsuleLifecycleStatus::Revoked], true)) {
                throw new CapsuleRegistryConflict('Only an active Capsule can be revoked.');
            }

            return $record;
        }, 3);
        if ($capsule->status === CapsuleLifecycleStatus::Revoked) {
            return;
        }
        $this->broker->revokeCapsule((int) $creator->getKey(), $capsuleId, $capsuleRevision);
        DB::transaction(function () use ($capsule, $now): void {
            $record = CreatorCapsule::query()->lockForUpdate()->findOrFail($capsule->getKey());
            if ($record->status === CapsuleLifecycleStatus::RevocationPending) {
                $record->transitionTo(CapsuleLifecycleStatus::Revoked);
                $record->forceFill(['revoked_at' => $now])->save();
            }
        }, 3);
        try {
            $this->metrics->record(new CtxMetricEvent(
                eventId: CtxMetricEvent::deterministicIdentifier(
                    'capsule-revoked',
                    config('sharecapsules.ctx.issuer').'\0'.$capsuleId.'\0'.$capsuleRevision,
                ),
                type: CtxMetricEventType::CapsuleRevoked,
                provider: (string) config('sharecapsules.ctx.issuer'),
                broker: (string) config('sharecapsules.broker.base_url'),
                capsuleId: $capsuleId,
                capsuleRevision: $capsuleRevision,
                occurredAt: $now,
            ));
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
