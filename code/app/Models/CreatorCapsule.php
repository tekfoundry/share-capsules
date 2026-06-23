<?php

namespace App\Models;

use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Capsules\Registry\InvalidCapsuleLifecycleTransition;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class CreatorCapsule extends Model
{
    protected $guarded = [];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transitionTo(CapsuleLifecycleStatus $next): void
    {
        if ($this->status === $next) {
            return;
        }
        if (! $this->status->canTransitionTo($next)) {
            throw new InvalidCapsuleLifecycleTransition("Cannot transition Capsule from {$this->status->value} to {$next->value}.");
        }

        $this->status = $next;
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'policy' => 'array',
            'status' => CapsuleLifecycleStatus::class,
            'capsule_revision' => 'integer',
            'capsule_lifetime_limit' => 'integer',
            'account_capsule_lifetime_limit' => 'integer',
            'pending_expires_at' => 'immutable_datetime',
            'not_before' => 'immutable_datetime',
            'not_after' => 'immutable_datetime',
            'finalized_at' => 'immutable_datetime',
            'revocation_requested_at' => 'immutable_datetime',
            'revoked_at' => 'immutable_datetime',
            'cleanup_requested_at' => 'immutable_datetime',
            'destroyed_at' => 'immutable_datetime',
        ];
    }
}
