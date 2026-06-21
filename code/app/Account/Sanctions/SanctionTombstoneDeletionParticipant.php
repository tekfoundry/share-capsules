<?php

namespace App\Account\Sanctions;

use App\Account\Deletion\AccountDeletionParticipant;
use App\Models\AccountSanction;
use App\Models\SanctionTombstone;
use App\Models\User;

final readonly class SanctionTombstoneDeletionParticipant implements AccountDeletionParticipant
{
    public function __construct(private SanctionEmailHasher $hasher) {}

    public function beforeAccountDeletion(User $user): void
    {
        $maximumRetention = now()->addDays(
            (int) config('accounts.sanctions.tombstone_max_days'),
        );

        $user->sanctions()
            ->whereNull('reversed_at')
            ->where('expires_at', '>', now())
            ->each(function (AccountSanction $sanction) use ($user, $maximumRetention): void {
                $retainUntil = $sanction->expires_at->lessThan($maximumRetention)
                    ? $sanction->expires_at
                    : $maximumRetention;

                SanctionTombstone::query()->updateOrCreate(
                    ['appeal_reference' => $sanction->appeal_reference],
                    [
                        'email_hmac' => $this->hasher->hash($user->email),
                        'category' => $sanction->category,
                        'imposed_at' => $sanction->imposed_at,
                        'sanction_expires_at' => $sanction->expires_at,
                        'retain_until' => $retainUntil,
                        'created_at' => now(),
                    ],
                );
            });
    }
}
