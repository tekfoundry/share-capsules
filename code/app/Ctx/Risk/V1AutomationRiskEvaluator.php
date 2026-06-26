<?php

namespace App\Ctx\Risk;

use App\Ctx\Policy\AutomationRiskDecision;
use App\Ctx\Policy\AutomationRiskEvaluator;
use App\Ctx\Policy\AutomationUsageAssessment;
use App\Ctx\Trust\TrustScore;
use App\Ctx\Trust\UsageConfidence;
use App\Models\CtxAuthorizationTicket;
use App\Models\CtxAutomationRiskActivity;
use App\Models\CtxAutomationRiskAssessment;
use App\Models\User;
use Carbon\CarbonImmutable;

final class V1AutomationRiskEvaluator implements AutomationRiskEvaluator
{
    public function evaluate(User $user, string $issuer): AutomationRiskDecision
    {
        return $this->assessUsage($user, $issuer)->decision;
    }

    public function assessUsage(User $user, string $issuer): AutomationUsageAssessment
    {
        if (! hash_equals((string) config('sharecapsules.ctx.issuer'), $issuer)) {
            $now = CarbonImmutable::now();

            return new AutomationUsageAssessment(
                decision: AutomationRiskDecision::Unavailable,
                reason: AutomationRiskReason::None,
                usageScore: TrustScore::zero(),
                usageConfidence: UsageConfidence::Zero,
                ruleset: V1AutomationRiskRules::RULESET,
                evaluatedAt: $now,
                expiresAt: $now,
            );
        }

        $now = CarbonImmutable::now();
        $summary = $this->usageSummary($user, $now);
        $reason = $summary->reason;
        $decision = $reason === AutomationRiskReason::None
            ? AutomationRiskDecision::NotHigh
            : AutomationRiskDecision::High;
        $usageScore = $decision === AutomationRiskDecision::High
            ? TrustScore::zero()
            : TrustScore::fromInt(100 - min(99, (int) floor($summary->worstUtilization * 100)));

        CtxAutomationRiskAssessment::query()->updateOrCreate(
            [
                'user_id' => $user->getKey(),
                'issuer_key' => $this->issuerKey($issuer),
            ],
            [
                'issuer' => $issuer,
                'ruleset' => V1AutomationRiskRules::RULESET,
                'decision' => $decision,
                'reason' => $reason,
                'usage_score' => $usageScore->value,
                'usage_confidence' => $summary->usageConfidence,
                'evaluated_at' => $now,
                'expires_at' => $now->addSeconds(V1AutomationRiskRules::ASSESSMENT_LIFETIME_SECONDS),
            ],
        );

        return new AutomationUsageAssessment(
            decision: $decision,
            reason: $reason,
            usageScore: $usageScore,
            usageConfidence: $summary->usageConfidence,
            ruleset: V1AutomationRiskRules::RULESET,
            evaluatedAt: $now,
            expiresAt: $now->addSeconds(V1AutomationRiskRules::ASSESSMENT_LIFETIME_SECONDS),
        );
    }

    private function usageSummary(User $user, CarbonImmutable $now): AutomationUsageSummary
    {
        $activities = CtxAutomationRiskActivity::query()
            ->where('user_id', $user->getKey())
            ->where('occurred_at', '<=', $now);

        $authorizationAttempts = (clone $activities)
            ->where('activity_type', AutomationRiskActivityType::AuthorizationAttempted->value)
            ->where('occurred_at', '>=', $now->subSeconds(V1AutomationRiskRules::AUTHORIZATION_WINDOW_SECONDS))
            ->count();
        if ($authorizationAttempts >= V1AutomationRiskRules::AUTHORIZATION_ATTEMPT_LIMIT) {
            return $this->summary(AutomationRiskReason::AuthorizationVelocity, 1, $authorizationAttempts);
        }

        $recentReleases = (clone $activities)
            ->where('activity_type', AutomationRiskActivityType::RedemptionCommitted->value)
            ->where('occurred_at', '>=', $now->subSeconds(V1AutomationRiskRules::RELEASE_WINDOW_SECONDS));
        $committedReleases = (clone $recentReleases)->count();
        if ($committedReleases >= V1AutomationRiskRules::COMMITTED_RELEASE_LIMIT) {
            return $this->summary(AutomationRiskReason::CommittedReleaseVelocity, 1, $committedReleases);
        }
        $distinctCapsules = (clone $recentReleases)->distinct()->count('capsule_id');
        if ($distinctCapsules >= V1AutomationRiskRules::DISTINCT_CAPSULE_LIMIT) {
            return $this->summary(AutomationRiskReason::CapsuleSpread, 1, $distinctCapsules);
        }

        $ticketRejections = (clone $activities)
            ->where('activity_type', AutomationRiskActivityType::TicketRejected->value)
            ->where('occurred_at', '>=', $now->subSeconds(V1AutomationRiskRules::REJECTION_WINDOW_SECONDS))
            ->count();
        if ($ticketRejections >= V1AutomationRiskRules::TICKET_REJECTION_LIMIT) {
            return $this->summary(AutomationRiskReason::TicketMisuse, 1, $ticketRejections);
        }

        $pendingTickets = CtxAuthorizationTicket::query()
            ->where('user_id', $user->getKey())
            ->where('status', 'pending')
            ->where('expires_at', '>=', $now)
            ->count();
        if ($pendingTickets >= V1AutomationRiskRules::PENDING_TICKET_LIMIT) {
            return $this->summary(AutomationRiskReason::PendingTicketConcurrency, 1, $pendingTickets);
        }

        $signals = [
            $authorizationAttempts / V1AutomationRiskRules::AUTHORIZATION_ATTEMPT_LIMIT,
            $committedReleases / V1AutomationRiskRules::COMMITTED_RELEASE_LIMIT,
            $distinctCapsules / V1AutomationRiskRules::DISTINCT_CAPSULE_LIMIT,
            $ticketRejections / V1AutomationRiskRules::TICKET_REJECTION_LIMIT,
            $pendingTickets / V1AutomationRiskRules::PENDING_TICKET_LIMIT,
        ];
        $evidence = max($authorizationAttempts, $committedReleases, $distinctCapsules, $ticketRejections, $pendingTickets);

        return $this->summary(AutomationRiskReason::None, max($signals), $evidence);
    }

    private function summary(
        AutomationRiskReason $reason,
        float $worstUtilization,
        int $currentEvidence,
    ): AutomationUsageSummary {
        return new AutomationUsageSummary(
            reason: $reason,
            worstUtilization: min(1, $worstUtilization),
            usageConfidence: match (true) {
                $reason !== AutomationRiskReason::None => UsageConfidence::High,
                $currentEvidence === 0 => UsageConfidence::Zero,
                $currentEvidence < 10 => UsageConfidence::Low,
                $currentEvidence < 50 => UsageConfidence::Medium,
                default => UsageConfidence::High,
            },
        );
    }

    private function issuerKey(string $issuer): string
    {
        return sodium_bin2base64(
            hash('sha256', $issuer, true),
            SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
        );
    }
}

final readonly class AutomationUsageSummary
{
    public function __construct(
        public AutomationRiskReason $reason,
        public float $worstUtilization,
        public UsageConfidence $usageConfidence,
    ) {}
}
