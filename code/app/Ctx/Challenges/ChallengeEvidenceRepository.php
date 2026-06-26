<?php

namespace App\Ctx\Challenges;

use App\Models\User;
use App\Models\ViewerDevice;
use Carbon\CarbonImmutable;

interface ChallengeEvidenceRepository
{
    public function currentFor(
        User $user,
        ViewerDevice $device,
        ChallengeAttemptContext $context,
        ?CarbonImmutable $now = null,
    ): ?CurrentChallengeEvidence;

    public function resetFor(
        User $user,
        ViewerDevice $device,
        ChallengeAttemptContext $context,
        string $reason,
        ?CarbonImmutable $now = null,
    ): void;
}
