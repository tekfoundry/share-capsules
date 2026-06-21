<?php

namespace App\Ctx\Policy;

use App\Models\User;

interface CommittedReleaseCounter
{
    public function forCapsule(string $capsuleId, int $capsuleRevision): int;

    public function forAccountAndCapsule(
        User $user,
        string $capsuleId,
        int $capsuleRevision,
    ): int;
}
