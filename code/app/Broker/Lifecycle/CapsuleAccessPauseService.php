<?php

namespace App\Broker\Lifecycle;

use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Capsules\Registry\CapsuleRegistryConflict;
use App\Models\CreatorCapsule;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Throwable;

final readonly class CapsuleAccessPauseService
{
    public function __construct(private BrokerContentKeyLifecycle $broker) {}

    public function pause(User $creator, string $capsuleId, int $capsuleRevision): void
    {
        $capsule = DB::transaction(function () use ($creator, $capsuleId, $capsuleRevision): CreatorCapsule {
            $record = CreatorCapsule::query()->where('user_id', $creator->getKey())
                ->where('capsule_id', $capsuleId)->where('capsule_revision', $capsuleRevision)
                ->lockForUpdate()->firstOrFail();
            if ($record->status === CapsuleLifecycleStatus::Active) {
                $record->transitionTo(CapsuleLifecycleStatus::PausePending);
                $record->save();
            }
            if (! in_array($record->status, [CapsuleLifecycleStatus::PausePending, CapsuleLifecycleStatus::Paused], true)) {
                throw new CapsuleRegistryConflict('Only an active Capsule can be paused.');
            }

            return $record;
        }, 3);
        if ($capsule->status === CapsuleLifecycleStatus::Paused) {
            return;
        }
        try {
            $this->broker->pauseCapsule((int) $creator->getKey(), $capsuleId, $capsuleRevision);
        } catch (Throwable $exception) {
            DB::transaction(function () use ($capsule): void {
                $record = CreatorCapsule::query()->lockForUpdate()->findOrFail($capsule->getKey());
                if ($record->status === CapsuleLifecycleStatus::PausePending) {
                    $record->transitionTo(CapsuleLifecycleStatus::Active);
                    $record->save();
                }
            }, 3);

            throw $exception;
        }
        DB::transaction(function () use ($capsule): void {
            $record = CreatorCapsule::query()->lockForUpdate()->findOrFail($capsule->getKey());
            if ($record->status === CapsuleLifecycleStatus::PausePending) {
                $record->transitionTo(CapsuleLifecycleStatus::Paused);
                $record->save();
            }
        }, 3);
    }

    public function resume(User $creator, string $capsuleId, int $capsuleRevision): void
    {
        $capsule = DB::transaction(function () use ($creator, $capsuleId, $capsuleRevision): CreatorCapsule {
            $record = CreatorCapsule::query()->where('user_id', $creator->getKey())
                ->where('capsule_id', $capsuleId)->where('capsule_revision', $capsuleRevision)
                ->lockForUpdate()->firstOrFail();
            if ($record->status !== CapsuleLifecycleStatus::Paused) {
                throw new CapsuleRegistryConflict('Only a paused Capsule can be resumed.');
            }

            return $record;
        }, 3);
        $this->broker->resumeCapsule((int) $creator->getKey(), $capsuleId, $capsuleRevision);
        DB::transaction(function () use ($capsule): void {
            $record = CreatorCapsule::query()->lockForUpdate()->findOrFail($capsule->getKey());
            if ($record->status === CapsuleLifecycleStatus::Paused) {
                $record->transitionTo(CapsuleLifecycleStatus::Active);
                $record->save();
            }
        }, 3);
    }
}
