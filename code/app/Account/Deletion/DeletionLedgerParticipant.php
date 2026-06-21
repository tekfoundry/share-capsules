<?php

namespace App\Account\Deletion;

use App\Models\AccountDeletionLedgerEntry;
use App\Models\User;
use Illuminate\Support\Str;

final class DeletionLedgerParticipant implements AccountDeletionParticipant
{
    public function beforeAccountDeletion(User $user): void
    {
        AccountDeletionLedgerEntry::query()->firstOrCreate(
            ['account_id' => $user->getKey()],
            [
                'id' => (string) Str::ulid(),
                'deletion_due_at' => $user->deletion_due_at,
                'recorded_at' => now(),
                'retain_until' => now()->addDays(
                    (int) config('accounts.deletion_ledger.retention_days'),
                ),
            ],
        );
    }
}
