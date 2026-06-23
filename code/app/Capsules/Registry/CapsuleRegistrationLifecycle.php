<?php

namespace App\Capsules\Registry;

use App\Broker\Lifecycle\BrokerContentKeyLifecycle;
use App\Models\CreatorCapsule;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final readonly class CapsuleRegistrationLifecycle
{
    public function __construct(private BrokerContentKeyLifecycle $broker) {}

    public function finalize(
        User $creator,
        string $registrationId,
        string $releaseHandle,
        ?CarbonImmutable $now = null,
    ): CreatorCapsule {
        $now ??= CarbonImmutable::now();

        return DB::transaction(function () use ($creator, $registrationId, $releaseHandle, $now): CreatorCapsule {
            $capsule = $this->ownedLocked($creator, $registrationId);
            if ($capsule->status === CapsuleLifecycleStatus::Active) {
                if (! is_string($capsule->release_handle) || ! hash_equals($capsule->release_handle, $releaseHandle)) {
                    throw new CapsuleRegistryConflict('The finalized release handle does not match.');
                }

                return $capsule;
            }
            if ($capsule->status !== CapsuleLifecycleStatus::Pending
                || $capsule->pending_expires_at->lessThanOrEqualTo($now)) {
                throw new CapsuleRegistryConflict('The pending Capsule can no longer be finalized.');
            }

            $this->broker->finalizeRegistration((int) $creator->getKey(), $registrationId, $releaseHandle);
            $capsule->transitionTo(CapsuleLifecycleStatus::Active);
            $capsule->forceFill([
                'release_handle' => $releaseHandle,
                'finalized_at' => $now,
            ])->save();

            return $capsule;
        }, 3);
    }

    public function cancel(
        User $creator,
        string $registrationId,
        ?CarbonImmutable $now = null,
    ): CreatorCapsule {
        $now ??= CarbonImmutable::now();
        $capsule = DB::transaction(function () use ($creator, $registrationId, $now): CreatorCapsule {
            $record = $this->ownedLocked($creator, $registrationId);
            if ($record->status === CapsuleLifecycleStatus::Destroyed) {
                return $record;
            }
            if (in_array($record->status, [CapsuleLifecycleStatus::Pending, CapsuleLifecycleStatus::Active], true)) {
                $record->transitionTo(CapsuleLifecycleStatus::CleanupPending);
                $record->forceFill(['cleanup_requested_at' => $now])->save();
            }
            if ($record->status !== CapsuleLifecycleStatus::CleanupPending) {
                throw new CapsuleRegistryConflict('Only an incomplete Capsule registration can be cancelled.');
            }

            return $record;
        }, 3);

        if ($capsule->status === CapsuleLifecycleStatus::Destroyed) {
            return $capsule;
        }
        $this->broker->cancelRegistration((int) $creator->getKey(), $registrationId);

        return DB::transaction(function () use ($capsule, $now): CreatorCapsule {
            $record = CreatorCapsule::query()->lockForUpdate()->findOrFail($capsule->getKey());
            if ($record->status === CapsuleLifecycleStatus::CleanupPending) {
                $record->transitionTo(CapsuleLifecycleStatus::Destroyed);
                $record->forceFill(['destroyed_at' => $now])->save();
            }

            return $record;
        }, 3);
    }

    private function ownedLocked(User $creator, string $registrationId): CreatorCapsule
    {
        $capsule = CreatorCapsule::query()
            ->where('user_id', $creator->getKey())
            ->where('registration_id', $registrationId)
            ->lockForUpdate()
            ->first();
        if (! $capsule instanceof CreatorCapsule) {
            throw new CapsuleRegistryConflict('The Capsule registration was not found.');
        }

        return $capsule;
    }
}
