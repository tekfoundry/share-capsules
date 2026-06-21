<?php

namespace App\Account\Sessions;

use App\Models\User;
use Illuminate\Support\Collection;

interface AccountSessionRepository
{
    /** @return Collection<int, AccountSession> */
    public function forUser(User $user, string $currentSessionId): Collection;

    public function revoke(User $user, string $sessionId, string $currentSessionId): bool;

    public function revokeOthers(User $user, string $currentSessionId): int;

    public function revokeAll(User $user): int;
}
