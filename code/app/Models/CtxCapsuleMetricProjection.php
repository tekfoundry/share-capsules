<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class CtxCapsuleMetricProjection extends Model
{
    protected $guarded = [];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['fresh_through' => 'immutable_datetime'];
    }
}
