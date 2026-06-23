<?php

namespace App\Console\Commands;

use App\Capsules\Registry\ExpiredCapsuleRegistrationCleaner;
use Illuminate\Console\Command;

final class CleanExpiredCapsuleRegistrations extends Command
{
    protected $signature = 'capsules:clean-pending {--limit=100}';

    protected $description = 'Destroy expired or incomplete pending Capsule registrations.';

    public function handle(ExpiredCapsuleRegistrationCleaner $cleaner): int
    {
        $result = $cleaner->clean((int) $this->option('limit'));
        $this->info("Cleaned {$result['cleaned']} pending Capsule registrations; {$result['failed']} failed.");

        return $result['failed'] === 0 ? self::SUCCESS : self::FAILURE;
    }
}
