<?php

namespace App\Account\Deletion;

use App\Broker\Lifecycle\BrokerContentKeyLifecycle;
use App\Models\User;

final readonly class BrokerContentKeyDeletionParticipant implements AccountDeletionParticipant
{
    public function __construct(private BrokerContentKeyLifecycle $broker) {}

    public function beforeAccountDeletion(User $user): void
    {
        $this->broker->destroyCreator((int) $user->getKey());
    }
}
