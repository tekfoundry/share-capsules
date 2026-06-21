<?php

namespace App\Models;

use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'id',
    'user_id',
    'name',
    'proof_public_key',
    'proof_jkt',
    'agreement_public_key',
    'agreement_jkt',
    'status',
    'last_used_at',
    'suspended_at',
    'revoked_at',
])]
final class ViewerDevice extends Model
{
    use HasUuids;

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'status' => ViewerDeviceStatus::class,
            'last_used_at' => 'immutable_datetime',
            'suspended_at' => 'immutable_datetime',
            'revoked_at' => 'immutable_datetime',
        ];
    }
}
