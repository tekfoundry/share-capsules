<?php

namespace App\Ctx\Policy;

use App\Ctx\Risk\AutomationRiskReason;
use App\Ctx\Trust\TrustScore;
use App\Ctx\Trust\UsageConfidence;
use Carbon\CarbonImmutable;

final readonly class AutomationUsageAssessment
{
    public function __construct(
        public AutomationRiskDecision $decision,
        public AutomationRiskReason $reason,
        public TrustScore $usageScore,
        public UsageConfidence $usageConfidence,
        public string $ruleset,
        public CarbonImmutable $evaluatedAt,
        public CarbonImmutable $expiresAt,
    ) {}

    public function severeUsageRisk(): bool
    {
        return $this->decision === AutomationRiskDecision::High;
    }

    public function unavailable(): bool
    {
        return $this->decision === AutomationRiskDecision::Unavailable;
    }
}
