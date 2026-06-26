<?php

namespace App\Ctx\Policy;

use App\Models\User;

interface AutomationRiskEvaluator
{
    public function evaluate(User $user, string $issuer): AutomationRiskDecision;

    public function assessUsage(User $user, string $issuer): AutomationUsageAssessment;
}
