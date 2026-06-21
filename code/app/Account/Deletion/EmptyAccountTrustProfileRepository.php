<?php

namespace App\Account\Deletion;

final class EmptyAccountTrustProfileRepository implements AccountTrustProfileRepository
{
    public function deleteForAccount(int $accountId): void
    {
        // V1 does not persist trust-profile state yet. The explicit adapter keeps
        // deletion mandatory when that storage is introduced.
    }
}
