<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'id',
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
    'challenge_set_version',
    'selector_version',
    'scoring_model_version',
    'status',
    'challenge_score',
    'issued_at',
    'expires_at',
    'retention_purpose',
    'evidence_retained_until',
    'completed_at',
])]
final class CtxChallengeAttempt extends Model
{
    use HasUuids, MassPrunable;

    /** @return Builder<static> */
    public function prunable(): Builder
    {
        return self::query()
            ->where('evidence_retained_until', '<=', now())
            ->orWhere(function (Builder $query): void {
                $query
                    ->whereNull('evidence_retained_until')
                    ->where('expires_at', '<=', now()->subDay());
            });
    }

    /** @return HasMany<CtxChallengeAttemptModule, $this> */
    public function modules(): HasMany
    {
        return $this->hasMany(CtxChallengeAttemptModule::class, 'ctx_challenge_attempt_id', 'id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'capsule_revision' => 'integer',
            'challenge_score' => 'integer',
            'issued_at' => 'immutable_datetime',
            'expires_at' => 'immutable_datetime',
            'evidence_retained_until' => 'immutable_datetime',
            'completed_at' => 'immutable_datetime',
        ];
    }
}
