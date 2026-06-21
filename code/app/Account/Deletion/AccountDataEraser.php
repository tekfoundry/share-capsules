<?php

namespace App\Account\Deletion;

use App\Account\Sessions\AccountSessionRepository;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Laravel\Passport\Passport;

final readonly class AccountDataEraser
{
    public function __construct(
        private AccountSessionRepository $sessions,
        private AccountTrustProfileRepository $trustProfiles,
    ) {}

    public function erase(User $user): void
    {
        $accountId = (int) $user->getKey();
        $accessTokenIds = Passport::token()->newQuery()
            ->where('user_id', $accountId)
            ->pluck('id');

        Passport::refreshToken()->newQuery()->whereIn('access_token_id', $accessTokenIds)->delete();
        Passport::token()->newQuery()->whereIn('id', $accessTokenIds)->delete();
        Passport::authCode()->newQuery()->where('user_id', $accountId)->delete();
        $this->sessions->revokeAll($user);
        DB::table('password_reset_tokens')->where('email', $user->email)->delete();
        $this->trustProfiles->deleteForAccount($accountId);
        $user->delete();
    }
}
