<?php

namespace App\Ctx\Policy;

enum PolicyDecisionCode: string
{
    case Allowed = 'allowed';
    case EmailVerificationRequired = 'email_verification_required';
    case AccountUnavailable = 'account_unavailable';
    case DeviceRegistrationRequired = 'device_registration_required';
    case ConsentRequired = 'consent_required';
    case CapsuleLimitReached = 'capsule_limit_reached';
    case AccountCapsuleLimitReached = 'account_capsule_limit_reached';
    case AutomationRiskHigh = 'automation_risk_high';
    case PolicyUnsatisfied = 'policy_unsatisfied';
}
