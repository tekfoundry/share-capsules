<?php

namespace App\Console\Commands;

use App\Account\Deletion\DeletionLedgerReplayService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

final class ReapplyAccountDeletions extends Command
{
    protected $signature = 'accounts:reapply-deletions {--restore-id= : Unique UUID for this restore operation}';

    protected $description = 'Reapply durable account-deletion obligations before serving a restored backup';

    public function handle(DeletionLedgerReplayService $replay): int
    {
        $restoreId = (string) ($this->option('restore-id') ?: config('accounts.deletion_ledger.restore_id'));

        if (! Str::isUuid($restoreId)) {
            $this->components->error('A valid unique restore UUID is required.');

            return self::INVALID;
        }

        $deleted = $replay->replay($restoreId);
        $this->components->info("Reapplied the deletion ledger; removed {$deleted} restored account(s).");

        return self::SUCCESS;
    }
}
