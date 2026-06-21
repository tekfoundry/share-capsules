<?php

namespace App\Account\Sanctions;

use App\Models\AccountSanction;
use App\Models\SanctionTombstone;
use App\Models\User;
use DateTimeInterface;
use Illuminate\Support\Str;
use InvalidArgumentException;

final class AccountSanctionService
{
    public function impose(
        User $user,
        SanctionCategory $category,
        DateTimeInterface $expiresAt,
        ?string $appealReference = null,
    ): AccountSanction {
        if ($expiresAt <= now()) {
            throw new InvalidArgumentException('A sanction expiry must be in the future.');
        }

        return AccountSanction::query()->create([
            'user_id' => $user->getKey(),
            'category' => $category,
            'imposed_at' => now(),
            'expires_at' => $expiresAt,
            'appeal_reference' => $appealReference ?? (string) Str::ulid(),
        ]);
    }

    public function reverseByAppealReference(string $appealReference): int
    {
        $reversed = AccountSanction::query()
            ->where('appeal_reference', $appealReference)
            ->whereNull('reversed_at')
            ->update(['reversed_at' => now()]);
        $deleted = SanctionTombstone::query()
            ->where('appeal_reference', $appealReference)
            ->delete();

        return $reversed + $deleted;
    }
}
