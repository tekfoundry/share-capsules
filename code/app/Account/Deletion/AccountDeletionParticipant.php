<?php

namespace App\Account\Deletion;

use App\Models\User;

interface AccountDeletionParticipant
{
    /**
     * Perform an atomic, local deletion prerequisite while the account row is locked.
     * Throwing aborts deletion so the operation can be safely retried.
     */
    public function beforeAccountDeletion(User $user): void;
}
