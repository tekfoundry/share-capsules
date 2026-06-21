<?php

namespace App\Account\Deletion;

use App\Models\DeletionRestoreCheckpoint;
use Illuminate\Support\Str;
use Throwable;

final class DeletionRestoreReadiness
{
    public function isReady(): bool
    {
        if (! config('accounts.deletion_ledger.replay_required')) {
            return true;
        }

        $restoreId = (string) config('accounts.deletion_ledger.restore_id');

        if (! Str::isUuid($restoreId)) {
            return false;
        }

        try {
            return DeletionRestoreCheckpoint::query()->whereKey($restoreId)->exists();
        } catch (Throwable) {
            return false;
        }
    }
}
