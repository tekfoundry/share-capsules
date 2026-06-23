<?php

namespace App\Capsules\Registry;

use App\Broker\Lifecycle\BrokerContentKeyLifecycle;
use App\Models\CreatorCapsule;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final readonly class CapsuleDeletionService
{
    public function __construct(private BrokerContentKeyLifecycle $broker) {}

    public function delete(User $creator, string $capsuleId, int $capsuleRevision): void
    {
        $now = CarbonImmutable::now();
        $capsule = DB::transaction(function () use ($creator, $capsuleId, $capsuleRevision, $now): CreatorCapsule {
            $record = CreatorCapsule::query()
                ->where('user_id', $creator->getKey())
                ->where('capsule_id', $capsuleId)
                ->where('capsule_revision', $capsuleRevision)
                ->lockForUpdate()
                ->firstOrFail();

            if ($record->status === CapsuleLifecycleStatus::Destroyed) {
                return $record;
            }
            if (in_array($record->status, [
                CapsuleLifecycleStatus::Active,
                CapsuleLifecycleStatus::RevocationPending,
                CapsuleLifecycleStatus::Revoked,
            ], true)) {
                $record->transitionTo(CapsuleLifecycleStatus::CleanupPending);
                $record->forceFill(['cleanup_requested_at' => $now])->save();
            }
            if ($record->status !== CapsuleLifecycleStatus::CleanupPending) {
                throw new CapsuleRegistryConflict('This Capsule cannot be deleted.');
            }

            return $record;
        }, 3);

        if ($capsule->status === CapsuleLifecycleStatus::Destroyed) {
            return;
        }

        $this->broker->destroyCapsule((int) $creator->getKey(), $capsuleId, $capsuleRevision);

        DB::transaction(function () use ($capsule, $now): void {
            $record = CreatorCapsule::query()->lockForUpdate()->findOrFail($capsule->getKey());
            if ($record->status === CapsuleLifecycleStatus::CleanupPending) {
                $record->transitionTo(CapsuleLifecycleStatus::Destroyed);
                $record->forceFill(['destroyed_at' => $now])->save();
            }
        }, 3);
    }
}
