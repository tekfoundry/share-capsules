<?php

namespace App\Models;

use App\Ctx\Policy\AutomationRiskDecision;
use App\Ctx\Risk\AutomationRiskReason;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;

final class CtxAutomationRiskAssessment extends Model
{
    use MassPrunable;

    protected $guarded = [];

    public function prunable(): Builder
    {
        return self::query()->where('evaluated_at', '<=', now()->subDays(30));
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'decision' => AutomationRiskDecision::class,
            'reason' => AutomationRiskReason::class,
            'evaluated_at' => 'immutable_datetime',
            'expires_at' => 'immutable_datetime',
        ];
    }
}
