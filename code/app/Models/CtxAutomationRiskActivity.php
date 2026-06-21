<?php

namespace App\Models;

use App\Ctx\Risk\AutomationRiskActivityType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'event_id',
    'user_id',
    'viewer_device_id',
    'activity_type',
    'capsule_id',
    'capsule_revision',
    'occurred_at',
])]
final class CtxAutomationRiskActivity extends Model
{
    use MassPrunable;

    protected $primaryKey = 'event_id';

    public $incrementing = false;

    protected $keyType = 'string';

    public function prunable(): Builder
    {
        return self::query()->where('occurred_at', '<=', now()->subDays(30));
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'activity_type' => AutomationRiskActivityType::class,
            'capsule_revision' => 'integer',
            'occurred_at' => 'immutable_datetime',
        ];
    }
}
