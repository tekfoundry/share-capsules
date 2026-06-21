<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['restore_id', 'ledger_high_watermark', 'completed_at'])]
final class DeletionRestoreCheckpoint extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $primaryKey = 'restore_id';

    protected $keyType = 'string';

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['completed_at' => 'immutable_datetime'];
    }
}
