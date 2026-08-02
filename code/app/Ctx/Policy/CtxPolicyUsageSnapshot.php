<?php

namespace App\Ctx\Policy;

use App\Models\User;

final readonly class CtxPolicyUsageSnapshot
{
    public function __construct(
        private CommittedReleaseCounter $releases,
    ) {}

    /**
     * @return array{
     *     capsule_lifetime?: array{used: int, maximum: int, remaining: int},
     *     account_capsule_lifetime?: array{used: int, maximum: int, remaining: int}
     * }
     */
    public function forPolicy(
        CtxPolicyV1 $policy,
        User $user,
        string $capsuleId,
        int $capsuleRevision,
    ): array {
        $usage = [];

        if ($policy->capsuleLifetimeLimit !== null) {
            $used = $this->releases->forCapsule($capsuleId, $capsuleRevision);
            $usage['capsule_lifetime'] = $this->limitUsage($used, $policy->capsuleLifetimeLimit);
        }

        if ($policy->accountCapsuleLifetimeLimit !== null) {
            $used = $this->releases->forAccountAndCapsule($user, $capsuleId, $capsuleRevision);
            $usage['account_capsule_lifetime'] = $this->limitUsage($used, $policy->accountCapsuleLifetimeLimit);
        }

        return $usage;
    }

    /** @return array{used: int, maximum: int, remaining: int} */
    private function limitUsage(int $used, int $maximum): array
    {
        return [
            'used' => $used,
            'maximum' => $maximum,
            'remaining' => max(0, $maximum - $used),
        ];
    }
}
