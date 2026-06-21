<?php

namespace App\Account\Deletion;

use App\Account\Sessions\AccountSessionRepository;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Laravel\Passport\Passport;
use Throwable;

final readonly class AccountDeletionService
{
    /** @param iterable<AccountDeletionParticipant> $participants */
    public function __construct(
        private AccountSessionRepository $sessions,
        private AccountTrustProfileRepository $trustProfiles,
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

            $this->trustProfiles->deleteForAccount($accountId);
            $this->deleteCredentialsAndAccountState($user);
            $user->delete();

            return true;
        });
    }

    private function deleteCredentialsAndAccountState(User $user): void
    {
        $accessTokenIds = Passport::token()->newQuery()
            ->where('user_id', $user->getKey())
            ->pluck('id');

        Passport::refreshToken()->newQuery()
            ->whereIn('access_token_id', $accessTokenIds)
            ->delete();
        Passport::token()->newQuery()
            ->whereIn('id', $accessTokenIds)
            ->delete();
        Passport::authCode()->newQuery()
            ->where('user_id', $user->getKey())
            ->delete();
        $this->sessions->revokeAll($user);
        DB::table('password_reset_tokens')->where('email', $user->email)->delete();
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
