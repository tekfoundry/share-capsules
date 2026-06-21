<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'jti',
    'user_id',
    'viewer_device_id',
    'signing_kid',
    'ticket_sha256',
    'broker',
    'capsule_id',
    'capsule_revision',
    'policy_sha256',
    'payload_id',
    'release_handle',
    'proof_jkt',
    'agreement_jkt',
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
    protected $primaryKey = 'jti';

    public $incrementing = false;

    protected $keyType = 'string';

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'capsule_revision' => 'integer',
            'capsule_lifetime_limit' => 'integer',
            'account_capsule_lifetime_limit' => 'integer',
            'issued_at' => 'immutable_datetime',
            'expires_at' => 'immutable_datetime',
            'redeemed_at' => 'immutable_datetime',
        ];
    }
}
