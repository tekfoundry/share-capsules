<?php

namespace App\Account\Closure;

use App\Models\User;

interface CapsuleInventoryRepository
{
    /** @return list<array<string, mixed>> */
    public function forAccount(User $user): array;
}
