<?php

namespace App\Ctx\Policy;

use App\Models\CtxAccountCapsuleReleaseCounter;
use App\Models\CtxCapsuleReleaseCounter;
use App\Models\User;

final class DatabaseCommittedReleaseCounter implements CommittedReleaseCounter
{
    public function forCapsule(string $capsuleId, int $capsuleRevision): int
    {
        return (int) (CtxCapsuleReleaseCounter::query()
            ->where('capsule_id', $capsuleId)
            ->where('capsule_revision', $capsuleRevision)
            ->value('committed_releases') ?? 0);
    }

    public function forAccountAndCapsule(User $user, string $capsuleId, int $capsuleRevision): int
    {
        return (int) (CtxAccountCapsuleReleaseCounter::query()
            ->where('user_id', $user->getKey())
            ->where('capsule_id', $capsuleId)
            ->where('capsule_revision', $capsuleRevision)
            ->value('committed_releases') ?? 0);
    }
}
