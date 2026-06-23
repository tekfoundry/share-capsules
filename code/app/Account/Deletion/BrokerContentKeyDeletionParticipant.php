<?php

namespace App\Account\Deletion;

use App\Broker\Lifecycle\BrokerContentKeyLifecycle;
use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Models\User;

final readonly class BrokerContentKeyDeletionParticipant implements AccountDeletionParticipant
{
    public function __construct(private BrokerContentKeyLifecycle $broker) {}

    public function beforeAccountDeletion(User $user): void
    {
        $user->creatorCapsules()->where('status', '!=', CapsuleLifecycleStatus::Destroyed->value)
            ->update(['status' => CapsuleLifecycleStatus::CleanupPending->value, 'cleanup_requested_at' => now()]);
        $this->broker->destroyCreator((int) $user->getKey());
        $user->creatorCapsules()->update([
            'status' => CapsuleLifecycleStatus::Destroyed->value,
            'destroyed_at' => now(),
        ]);
    }
}
