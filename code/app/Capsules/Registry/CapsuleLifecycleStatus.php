<?php

namespace App\Capsules\Registry;

enum CapsuleLifecycleStatus: string
{
    case Pending = 'pending';
    case Active = 'active';
    case PausePending = 'pause_pending';
    case Paused = 'paused';
    case RevocationPending = 'revocation_pending';
    case Revoked = 'revoked';
    case CleanupPending = 'cleanup_pending';
    case Destroyed = 'destroyed';

    public function permitsRelease(): bool
    {
        return $this === self::Active;
    }

    public function canTransitionTo(self $next): bool
    {
        return match ($this) {
            self::Pending => in_array($next, [self::Active, self::CleanupPending], true),
            self::Active => in_array($next, [self::PausePending, self::RevocationPending, self::CleanupPending], true),
            self::PausePending => in_array($next, [self::Paused, self::RevocationPending, self::CleanupPending], true),
            self::Paused => in_array($next, [self::Active, self::RevocationPending, self::CleanupPending], true),
            self::RevocationPending => in_array($next, [self::Revoked, self::CleanupPending], true),
            self::Revoked => $next === self::CleanupPending,
            self::CleanupPending => $next === self::Destroyed,
            self::Destroyed => false,
        };
    }
}
