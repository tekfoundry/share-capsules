<?php

namespace App\Models;

use App\Account\Sanctions\SanctionCategory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'category',
    'imposed_at',
    'expires_at',
    'reversed_at',
    'appeal_reference',
])]
final class AccountSanction extends Model
{
    public $timestamps = false;

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isActive(): bool
    {
        return $this->reversed_at === null && $this->expires_at->isFuture();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'category' => SanctionCategory::class,
            'imposed_at' => 'immutable_datetime',
            'expires_at' => 'immutable_datetime',
            'reversed_at' => 'immutable_datetime',
        ];
    }
}
