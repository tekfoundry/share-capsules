<?php

namespace App\Ctx\Policy;

use App\Ctx\Challenges\ChallengeAttemptContext;
use App\Ctx\Challenges\ChallengeEvidenceRepository;
use App\Ctx\Trust\TrustCapsuleOutcome;
use App\Ctx\Trust\TrustCapsuleOutcomeCombiner;
use App\Ctx\Trust\TrustScore;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Carbon\CarbonImmutable;

final readonly class PreliminaryPolicyEvaluator
{
    public function __construct(
        private CommittedReleaseCounter $releases,
        private AutomationRiskEvaluator $automationRisk,
        private TrustCapsuleOutcomeCombiner $trustOutcomes,
        private ChallengeEvidenceRepository $challengeEvidence,
    ) {}

    public function evaluate(
        CtxPolicyV1 $policy,
        User $user,
        ViewerDevice $device,
        string $capsuleId,
        int $capsuleRevision,
        bool $viewEventConsent,
        ?ChallengeAttemptContext $challengeContext = null,
        ?CarbonImmutable $now = null,
    ): PreliminaryPolicyDecision {
        $now ??= CarbonImmutable::now();
        if ($user->email_verified_at === null) {
            return $this->decision(PolicyDecisionCode::EmailVerificationRequired);
        }
        if ($user->isClosed()) {
            return $this->decision(PolicyDecisionCode::AccountUnavailable);
        }
        if ((string) $device->user_id !== (string) $user->getKey()
            || $device->status !== ViewerDeviceStatus::Active) {
            return $this->decision(PolicyDecisionCode::DeviceRegistrationRequired);
        }
        if (! $viewEventConsent) {
            return $this->decision(PolicyDecisionCode::ConsentRequired);
        }
        if (($policy->notBefore !== null && $now->lessThan($policy->notBefore))
            || ($policy->notAfter !== null && ! $now->lessThan($policy->notAfter))) {
            return $this->decision(PolicyDecisionCode::PolicyUnsatisfied);
        }
        if ($policy->capsuleLifetimeLimit !== null
            && $this->releases->forCapsule($capsuleId, $capsuleRevision)
                >= $policy->capsuleLifetimeLimit) {
            return $this->decision(PolicyDecisionCode::CapsuleLimitReached);
        }
        if ($policy->accountCapsuleLifetimeLimit !== null
            && $this->releases->forAccountAndCapsule($user, $capsuleId, $capsuleRevision)
                >= $policy->accountCapsuleLifetimeLimit) {
            return $this->decision(PolicyDecisionCode::AccountCapsuleLimitReached);
        }
        if ($policy->automationRiskIssuer !== null) {
            $risk = $this->automationRisk->assessUsage($user, $policy->automationRiskIssuer);
            if ($risk->severeUsageRisk()) {
                if ($challengeContext !== null) {
                    $this->challengeEvidence->resetFor($user, $device, $challengeContext, 'high_automation_risk', $now);
                }

                return $this->decision(PolicyDecisionCode::AutomationRiskHigh);
            }
            if ($risk->unavailable()) {
                return $this->decision(PolicyDecisionCode::PolicyUnsatisfied);
            }
            $challenge = $challengeContext === null
                ? null
                : $this->challengeEvidence->currentFor($user, $device, $challengeContext, $now);
            $trust = $this->trustOutcomes->assess(
                usageScore: $risk->usageScore,
                usageConfidence: $risk->usageConfidence,
                challengeScore: $challenge?->score ?? TrustScore::zero(),
                lastChallengedAt: $challenge?->lastChallengedAt,
                challengeExpiresAt: $challenge?->expiresAt,
                now: $now,
            );

            if ($trust->finalOutcome === TrustCapsuleOutcome::ChallengeRequired) {
                return $this->decision(PolicyDecisionCode::ChallengeRequired);
            }
            if ($trust->finalOutcome !== TrustCapsuleOutcome::Allow) {
                return $this->decision(PolicyDecisionCode::PolicyUnsatisfied);
            }
        }

        return $this->decision(PolicyDecisionCode::Allowed);
    }

    private function decision(PolicyDecisionCode $code): PreliminaryPolicyDecision
    {
        return new PreliminaryPolicyDecision($code);
    }
}
