<?php

namespace App\Ctx\Policy;

use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;

final readonly class PreliminaryPolicyEvaluator
{
    public function __construct(
        private CommittedReleaseCounter $releases,
        private AutomationRiskEvaluator $automationRisk,
    ) {}

    public function evaluate(
        CtxPolicyV1 $policy,
        User $user,
        ViewerDevice $device,
        string $capsuleId,
        int $capsuleRevision,
        bool $viewEventConsent,
    ): PreliminaryPolicyDecision {
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
            $risk = $this->automationRisk->evaluate($user, $policy->automationRiskIssuer);
            if ($risk === AutomationRiskDecision::High) {
                return $this->decision(PolicyDecisionCode::AutomationRiskHigh);
            }
            if ($risk === AutomationRiskDecision::Unavailable) {
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
