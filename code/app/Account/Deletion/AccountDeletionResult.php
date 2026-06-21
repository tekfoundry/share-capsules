<?php

namespace App\Account\Deletion;

final readonly class AccountDeletionResult
{
    /** @param list<int> $failedAccountIds */
    public function __construct(
        public int $deleted,
        public array $failedAccountIds,
    ) {}

    public function failed(): int
    {
        return count($this->failedAccountIds);
    }
}
