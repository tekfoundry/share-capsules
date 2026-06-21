<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class CtxCapsuleMetricBucket extends Model
{
    protected $guarded = [];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['bucket_start' => 'immutable_datetime'];
    }
}
