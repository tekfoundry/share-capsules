<?php

namespace App\Account\Deletion;

interface AccountTrustProfileRepository
{
    public function deleteForAccount(int $accountId): void;
}
