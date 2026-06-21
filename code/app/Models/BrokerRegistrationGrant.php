<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'token_hash',
    'user_id',
    'viewer_device_id',
    'registration_id',
    'capsule_id',
    'capsule_revision',
    'payload_id',
    'policy_sha256',
    'content_key_sha256',
    'expires_at',
    'redeemed_at',
])]
final class BrokerRegistrationGrant extends Model
{
    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<ViewerDevice, $this> */
    public function viewerDevice(): BelongsTo
    {
        return $this->belongsTo(ViewerDevice::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'capsule_revision' => 'integer',
            'expires_at' => 'immutable_datetime',
            'redeemed_at' => 'immutable_datetime',
        ];
    }
}
