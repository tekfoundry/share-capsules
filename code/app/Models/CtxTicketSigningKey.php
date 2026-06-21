<?php

namespace App\Models;

use App\Ctx\SigningKeys\TicketSigningKeyStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'kid',
    'public_key',
    'encrypted_private_key',
    'status',
    'published_at',
    'activated_at',
    'publish_until',
    'revoked_at',
])]
final class CtxTicketSigningKey extends Model
{
    protected $primaryKey = 'kid';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $hidden = ['encrypted_private_key'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'encrypted_private_key' => 'encrypted',
            'status' => TicketSigningKeyStatus::class,
            'published_at' => 'immutable_datetime',
            'activated_at' => 'immutable_datetime',
            'publish_until' => 'immutable_datetime',
            'revoked_at' => 'immutable_datetime',
        ];
    }
}
