<?php

namespace App\Models;

use App\Ctx\Challenges\ChallengeAttemptContext;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'scope_sha256',
    'user_id',
    'viewer_device_id',
    'host_origin',
    'broker',
    'capsule_id',
    'capsule_revision',
    'policy_sha256',
    'payload_id',
    'release_handle',
    'action',
    'challenge_success_streak',
    'challenge_refresh_tier',
    'last_challenge_score',
    'last_challenged_at',
    'challenge_expires_at',
    'last_reset_reason',
])]
final class CtxChallengeCadence extends Model
{
    public static function scopeKey(User $user, ViewerDevice $device, ChallengeAttemptContext $context): string
    {
        return hash('sha256', implode("\n", [
            (string) $user->getKey(),
            (string) $device->getKey(),
            $context->hostOrigin,
            $context->broker,
            $context->capsuleId,
            (string) $context->capsuleRevision,
            $context->policySha256,
            $context->payloadId,
            $context->releaseHandle,
            $context->action,
        ]));
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'capsule_revision' => 'integer',
            'challenge_success_streak' => 'integer',
            'last_challenge_score' => 'integer',
            'last_challenged_at' => 'immutable_datetime',
            'challenge_expires_at' => 'immutable_datetime',
        ];
    }
}
