<?php

namespace App\Models;

use App\Account\Sanctions\SanctionCategory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'email_hmac',
    'category',
    'imposed_at',
    'sanction_expires_at',
    'appeal_reference',
    'retain_until',
    'created_at',
])]
final class SanctionTombstone extends Model
{
    use MassPrunable;

    public $timestamps = false;

    /** @return Builder<static> */
    public function prunable(): Builder
    {
        return self::query()->where('retain_until', '<=', now());
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'category' => SanctionCategory::class,
            'imposed_at' => 'immutable_datetime',
            'sanction_expires_at' => 'immutable_datetime',
            'retain_until' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
        ];
    }
}
