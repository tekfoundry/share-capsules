<?php

namespace App\Account\Sessions;

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

final readonly class AccountSessionService
{
    public function __construct(private AccountSessionRepository $sessions) {}

    /** @return Collection<int, AccountSession> */
    public function forUser(User $user, string $currentSessionId): Collection
    {
        return $this->sessions->forUser($user, $currentSessionId);
    }

    public function revoke(User $user, string $sessionId, string $currentSessionId): bool
    {
        $revoked = $this->sessions->revoke($user, $sessionId, $currentSessionId);

        if ($revoked) {
            $this->rotatePersistentLoginToken($user);
        }

        return $revoked;
    }

    public function revokeOthers(User $user, string $currentSessionId): int
    {
        $revoked = $this->sessions->revokeOthers($user, $currentSessionId);

        if ($revoked > 0) {
            $this->rotatePersistentLoginToken($user);
        }

        return $revoked;
    }

    public function revokeAll(User $user): int
    {
        $revoked = $this->sessions->revokeAll($user);
        $this->rotatePersistentLoginToken($user);

        return $revoked;
    }

    private function rotatePersistentLoginToken(User $user): void
    {
        $user->forceFill(['remember_token' => Str::random(60)])->saveQuietly();
    }
}
