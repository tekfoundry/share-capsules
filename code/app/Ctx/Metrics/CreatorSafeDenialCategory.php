<?php

namespace App\Ctx\Metrics;

use App\Ctx\Contracts\CtxErrorCode;

enum CreatorSafeDenialCategory: string
{
    case Eligibility = 'eligibility';
    case Consent = 'consent';
    case Limit = 'limit';
    case Risk = 'risk';
    case Policy = 'policy';
    case Ticket = 'ticket';
    case Availability = 'availability';

    public static function fromProtocolCode(string $code): self
    {
        $error = CtxErrorCode::tryFrom($code);
        if ($error === null) {
            return self::Availability;
        }

        return match ($error) {
            CtxErrorCode::AuthenticationRequired,
            CtxErrorCode::EmailVerificationRequired,
            CtxErrorCode::AccountUnavailable,
            CtxErrorCode::DeviceRegistrationRequired => self::Eligibility,
            CtxErrorCode::ConsentRequired => self::Consent,
            CtxErrorCode::CapsuleLimitReached,
            CtxErrorCode::AccountCapsuleLimitReached => self::Limit,
            CtxErrorCode::AutomationRiskHigh => self::Risk,
            CtxErrorCode::InvalidRequest,
            CtxErrorCode::PolicyUnsatisfied,
            CtxErrorCode::UnsupportedContract => self::Policy,
            CtxErrorCode::InvalidTicket,
            CtxErrorCode::TicketExpired,
            CtxErrorCode::TicketReplayed,
            CtxErrorCode::InvalidProof => self::Ticket,
            CtxErrorCode::ReleaseUnavailable,
            CtxErrorCode::TemporarilyUnavailable => self::Availability,
        };
    }
}
