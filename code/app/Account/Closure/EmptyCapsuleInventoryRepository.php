<?php

namespace App\Account\Closure;

use App\Models\User;

final class EmptyCapsuleInventoryRepository implements CapsuleInventoryRepository
{
    public function forAccount(User $user): array
    {
        return [];
    }
}
