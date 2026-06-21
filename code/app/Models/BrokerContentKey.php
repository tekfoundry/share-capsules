<?php

namespace App\Models;

use App\Broker\Lifecycle\BrokerContentKeyStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'record_id',
    'registration_id',
    'release_handle',
    'creator_id',
    'capsule_id',
    'capsule_revision',
    'payload_id',
    'policy_sha256',
    'content_key_sha256',
    'protection_algorithm',
    'protection_key_id',
    'protection_nonce',
    'protected_content_key',
    'status',
    'paused_at',
    'revoked_at',
    'destroyed_at',
])]
final class BrokerContentKey extends Model
{
    protected $connection = 'broker';

    protected $primaryKey = 'record_id';

    public $incrementing = false;

    protected $keyType = 'string';

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'capsule_revision' => 'integer',
            'status' => BrokerContentKeyStatus::class,
            'paused_at' => 'immutable_datetime',
            'revoked_at' => 'immutable_datetime',
            'destroyed_at' => 'immutable_datetime',
        ];
    }
}
