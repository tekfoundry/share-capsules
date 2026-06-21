<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['id', 'account_id', 'deletion_due_at', 'recorded_at', 'retain_until'])]
final class AccountDeletionLedgerEntry extends Model
{
    use MassPrunable;

    public $incrementing = false;

    public $timestamps = false;

    protected $table = 'account_deletion_ledger';

    protected $keyType = 'string';

    public function getConnectionName(): ?string
    {
        return (string) config('accounts.deletion_ledger.connection');
    }

    /** @return Builder<static> */
    public function prunable(): Builder
    {
        return self::query()->where('retain_until', '<=', now());
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'deletion_due_at' => 'immutable_datetime',
            'recorded_at' => 'immutable_datetime',
            'retain_until' => 'immutable_datetime',
        ];
    }
}
