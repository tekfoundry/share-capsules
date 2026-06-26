<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;

final class BrokerDeviceProof extends Model
{
    use MassPrunable;

    protected $connection = 'broker';

    protected $primaryKey = 'jti';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    /** @return Builder<static> */
    public function prunable(): Builder
    {
        return self::query()->where('expires_at', '<=', now()->subDay());
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'expires_at' => 'immutable_datetime',
        ];
    }
}
