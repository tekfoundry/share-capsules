<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;

final class CtxMetricEventRecord extends Model
{
    use MassPrunable;

    protected $primaryKey = 'event_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    /** @return Builder<self> */
    public function prunable(): Builder
    {
        return self::query()->where('occurred_at', '<', now()->subDays(30));
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'optional_dimensions' => 'array',
            'occurred_at' => 'immutable_datetime',
            'projected_at' => 'immutable_datetime',
        ];
    }
}
