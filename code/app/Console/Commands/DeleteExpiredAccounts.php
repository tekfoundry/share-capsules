<?php

namespace App\Console\Commands;

use App\Account\Deletion\AccountDeletionService;
use Illuminate\Console\Command;

final class DeleteExpiredAccounts extends Command
{
    protected $signature = 'accounts:delete-expired
        {--limit=100 : Maximum accounts to process}
        {--dry-run : Count eligible accounts without deleting them}';

    protected $description = 'Permanently delete closed accounts whose recovery period expired';

    public function handle(AccountDeletionService $deletion): int
    {
        $limit = filter_var($this->option('limit'), FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1, 'max_range' => 1000],
        ]);

        if ($limit === false) {
            $this->components->error('The limit must be an integer between 1 and 1000.');

            return self::INVALID;
        }

        if ($this->option('dry-run')) {
            $eligible = $deletion->previewDue($limit);
            $this->components->info("{$eligible} expired account(s) would be permanently deleted.");

            return self::SUCCESS;
        }

        $result = $deletion->deleteDue($limit);
        $this->components->info("Permanently deleted {$result->deleted} expired account(s).");

        if ($result->failed() > 0) {
            $this->components->error("{$result->failed()} account deletion(s) failed and will be retried.");

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
