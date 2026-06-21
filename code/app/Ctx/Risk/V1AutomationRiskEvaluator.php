<?php

namespace App\Ctx\Risk;

use App\Ctx\Policy\AutomationRiskDecision;
use App\Ctx\Policy\AutomationRiskEvaluator;
use App\Models\CtxAuthorizationTicket;
use App\Models\CtxAutomationRiskActivity;
use App\Models\CtxAutomationRiskAssessment;
use App\Models\User;
use Carbon\CarbonImmutable;

final class V1AutomationRiskEvaluator implements AutomationRiskEvaluator
{
    public function evaluate(User $user, string $issuer): AutomationRiskDecision
    {
        if (! hash_equals((string) config('sharecapsules.ctx.issuer'), $issuer)) {
            return AutomationRiskDecision::Unavailable;
        }

        $now = CarbonImmutable::now();
        $reason = $this->reason($user, $now);
        $decision = $reason === AutomationRiskReason::None
            ? AutomationRiskDecision::NotHigh
            : AutomationRiskDecision::High;

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
                'evaluated_at' => $now,
                'expires_at' => $now->addSeconds(V1AutomationRiskRules::ASSESSMENT_LIFETIME_SECONDS),
            ],
        );

        return $decision;
    }

    private function reason(User $user, CarbonImmutable $now): AutomationRiskReason
    {
        $activities = CtxAutomationRiskActivity::query()
            ->where('user_id', $user->getKey())
            ->where('occurred_at', '<=', $now);

        if ((clone $activities)
            ->where('activity_type', AutomationRiskActivityType::AuthorizationAttempted->value)
            ->where('occurred_at', '>=', $now->subSeconds(V1AutomationRiskRules::AUTHORIZATION_WINDOW_SECONDS))
            ->count() >= V1AutomationRiskRules::AUTHORIZATION_ATTEMPT_LIMIT) {
            return AutomationRiskReason::AuthorizationVelocity;
        }

        $recentReleases = (clone $activities)
            ->where('activity_type', AutomationRiskActivityType::RedemptionCommitted->value)
            ->where('occurred_at', '>=', $now->subSeconds(V1AutomationRiskRules::RELEASE_WINDOW_SECONDS));
        if ((clone $recentReleases)->count() >= V1AutomationRiskRules::COMMITTED_RELEASE_LIMIT) {
            return AutomationRiskReason::CommittedReleaseVelocity;
        }
        if ((clone $recentReleases)->distinct()->count('capsule_id') >= V1AutomationRiskRules::DISTINCT_CAPSULE_LIMIT) {
            return AutomationRiskReason::CapsuleSpread;
        }

        if ((clone $activities)
            ->where('activity_type', AutomationRiskActivityType::TicketRejected->value)
            ->where('occurred_at', '>=', $now->subSeconds(V1AutomationRiskRules::REJECTION_WINDOW_SECONDS))
            ->count() >= V1AutomationRiskRules::TICKET_REJECTION_LIMIT) {
            return AutomationRiskReason::TicketMisuse;
        }

        if (CtxAuthorizationTicket::query()
            ->where('user_id', $user->getKey())
            ->where('status', 'pending')
            ->where('expires_at', '>=', $now)
            ->count() >= V1AutomationRiskRules::PENDING_TICKET_LIMIT) {
            return AutomationRiskReason::PendingTicketConcurrency;
        }

        return AutomationRiskReason::None;
    }

    private function issuerKey(string $issuer): string
    {
        return sodium_bin2base64(
            hash('sha256', $issuer, true),
            SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
        );
    }
}
