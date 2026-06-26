<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'jti',
    'user_id',
    'viewer_device_id',
    'signing_kid',
    'ticket_sha256',
    'host_origin',
    'broker',
    'capsule_id',
    'capsule_revision',
    'policy_sha256',
    'payload_id',
    'release_handle',
    'action',
    'proof_jkt',
    'agreement_jkt',
    'not_before',
    'not_after',
    'capsule_lifetime_limit',
    'account_capsule_lifetime_limit',
    'automation_risk_issuer',
    'status',
    'issued_at',
    'expires_at',
    'redeemed_at',
])]
final class CtxAuthorizationTicket extends Model
{
    use MassPrunable;

    protected $primaryKey = 'jti';

    public $incrementing = false;

    protected $keyType = 'string';

    /** @return Builder<static> */
    public function prunable(): Builder
    {
        return self::query()->where('expires_at', '<=', now()->subDay());
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'capsule_revision' => 'integer',
            'capsule_lifetime_limit' => 'integer',
            'account_capsule_lifetime_limit' => 'integer',
            'not_before' => 'immutable_datetime',
            'not_after' => 'immutable_datetime',
            'issued_at' => 'immutable_datetime',
            'expires_at' => 'immutable_datetime',
            'redeemed_at' => 'immutable_datetime',
        ];
    }
}
