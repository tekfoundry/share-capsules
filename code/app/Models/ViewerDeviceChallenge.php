<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'id',
    'device_id',
    'user_id',
    'nonce',
    'proof_public_key',
    'proof_jkt',
    'agreement_public_key',
    'agreement_jkt',
    'server_agreement_public_key',
    'agreement_confirmation_hash',
    'expires_at',
    'consumed_at',
])]
#[Hidden(['agreement_confirmation_hash'])]
final class ViewerDeviceChallenge extends Model
{
    use HasUuids, MassPrunable;

    /** @return Builder<static> */
    public function prunable(): Builder
    {
        return self::query()->where('expires_at', '<=', now()->subDay());
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'expires_at' => 'immutable_datetime',
            'consumed_at' => 'immutable_datetime',
        ];
    }
}
