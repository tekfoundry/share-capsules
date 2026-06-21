<?php

namespace App\Account\Sessions;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Connection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class DatabaseAccountSessionRepository implements AccountSessionRepository
{
    public function forUser(User $user, string $currentSessionId): Collection
    {
        return $this->connection()
            ->table($this->table())
            ->where('user_id', $user->getKey())
            ->orderByDesc('last_activity')
            ->get(['id', 'ip_address', 'user_agent', 'last_activity'])
            ->map(fn (object $session): AccountSession => new AccountSession(
                id: (string) $session->id,
                ipAddress: $session->ip_address ? (string) $session->ip_address : null,
                userAgent: $session->user_agent ? (string) $session->user_agent : null,
                lastActivityAt: CarbonImmutable::createFromTimestamp((int) $session->last_activity),
                isCurrent: hash_equals($currentSessionId, (string) $session->id),
            ));
    }

    public function revoke(User $user, string $sessionId, string $currentSessionId): bool
    {
        if (hash_equals($currentSessionId, $sessionId)) {
            return false;
        }

        return $this->connection()
            ->table($this->table())
            ->where('user_id', $user->getKey())
            ->where('id', $sessionId)
            ->delete() === 1;
    }

    public function revokeOthers(User $user, string $currentSessionId): int
    {
        return $this->connection()
            ->table($this->table())
            ->where('user_id', $user->getKey())
            ->where('id', '!=', $currentSessionId)
            ->delete();
    }

    public function revokeAll(User $user): int
    {
        return $this->connection()
            ->table($this->table())
            ->where('user_id', $user->getKey())
            ->delete();
    }

    private function connection(): Connection
    {
        $connection = config('session.connection');

        return DB::connection(is_string($connection) && $connection !== '' ? $connection : null);
    }

    private function table(): string
    {
        return (string) config('session.table', 'sessions');
    }
}
