<?php

namespace App\Account\Deletion;

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Throwable;

final readonly class AccountDeletionService
{
    /** @param iterable<AccountDeletionParticipant> $participants */
    public function __construct(
        private AccountDataEraser $eraser,
        private iterable $participants,
    ) {}

    public function deleteDue(int $limit): AccountDeletionResult
    {
        $accountIds = $this->dueAccountIds($limit);
        $deleted = 0;
        $failedAccountIds = [];

        foreach ($accountIds as $accountId) {
            try {
                if ($this->deleteAccount((int) $accountId)) {
                    $deleted++;
                }
            } catch (Throwable $exception) {
                report($exception);
                $failedAccountIds[] = (int) $accountId;
            }
        }

        return new AccountDeletionResult($deleted, $failedAccountIds);
    }

    public function previewDue(int $limit): int
    {
        return $this->dueAccountIds($limit)->count();
    }

    public function deleteAccount(int $accountId): bool
    {
        return DB::transaction(function () use ($accountId): bool {
            /** @var User|null $user */
            $user = User::query()->lockForUpdate()->find($accountId);

            if (! $user instanceof User
                || ! $user->isClosed()
                || $user->deletion_due_at === null
                || $user->deletion_due_at->isFuture()) {
                return false;
            }

            foreach ($this->participants as $participant) {
                $participant->beforeAccountDeletion($user);
            }

            $this->eraser->erase($user);

            return true;
        });
    }

    /** @return Collection<int, int> */
    private function dueAccountIds(int $limit): Collection
    {
        return User::query()
            ->whereNotNull('closed_at')
            ->whereNotNull('deletion_due_at')
            ->where('deletion_due_at', '<=', now())
            ->orderBy('deletion_due_at')
            ->orderBy('id')
            ->limit($limit)
            ->pluck('id')
            ->map(static fn (mixed $accountId): int => (int) $accountId);
    }
}
