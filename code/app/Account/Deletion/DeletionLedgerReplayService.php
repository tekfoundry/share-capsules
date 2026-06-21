<?php

namespace App\Account\Deletion;

use App\Models\AccountDeletionLedgerEntry;
use App\Models\DeletionRestoreCheckpoint;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final readonly class DeletionLedgerReplayService
{
    public function __construct(private AccountDataEraser $eraser) {}

    public function replay(string $restoreId): int
    {
        $highWatermark = AccountDeletionLedgerEntry::query()->max('id');
        $deleted = 0;

        AccountDeletionLedgerEntry::query()
            ->when($highWatermark, fn ($query) => $query->where('id', '<=', $highWatermark))
            ->orderBy('id')
            ->each(function (AccountDeletionLedgerEntry $entry) use (&$deleted): void {
                DB::transaction(function () use ($entry, &$deleted): void {
                    $user = User::query()->lockForUpdate()->find($entry->account_id);

                    if ($user instanceof User) {
                        $this->eraser->erase($user);
                        $deleted++;
                    }
                });
            });

        DeletionRestoreCheckpoint::query()->updateOrCreate(
            ['restore_id' => $restoreId],
            ['ledger_high_watermark' => $highWatermark, 'completed_at' => now()],
        );

        return $deleted;
    }
}
