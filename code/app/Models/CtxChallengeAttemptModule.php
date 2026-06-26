<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'ctx_challenge_attempt_id',
    'challenge_id',
    'module_version',
    'lifecycle_state',
    'input_modes',
    'event_schema_version',
    'scoring_adapter',
    'scoring_adapter_version',
    'selection_weight',
    'score',
    'reason_categories',
    'interaction_summary',
    'completed_at',
])]
final class CtxChallengeAttemptModule extends Model
{
    /** @return BelongsTo<CtxChallengeAttempt, $this> */
    public function attempt(): BelongsTo
    {
        return $this->belongsTo(CtxChallengeAttempt::class, 'ctx_challenge_attempt_id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'input_modes' => 'array',
            'reason_categories' => 'array',
            'interaction_summary' => 'array',
            'selection_weight' => 'integer',
            'score' => 'integer',
            'completed_at' => 'immutable_datetime',
        ];
    }
}
