<?php

namespace App\Broker\Release;

use App\Ctx\Contracts\CtxErrorCode;
use App\Ctx\Tickets\TicketRedemptionCode;
use LogicException;

final readonly class TicketRedemptionOutcome
{
    private function __construct(
        public ?TicketRedemptionCode $code,
        public bool $available,
    ) {}

    public static function responded(TicketRedemptionCode $code): self
    {
        return new self($code, true);
    }

    public static function unavailable(): self
    {
        return new self(null, false);
    }

    public function committed(): bool
    {
        return $this->available && in_array(
            $this->code,
            [TicketRedemptionCode::Committed, TicketRedemptionCode::AlreadyCommitted],
            true,
        );
    }

    public function publicError(): CtxErrorCode
    {
        if (! $this->available) {
            return CtxErrorCode::TemporarilyUnavailable;
        }

        return match ($this->code) {
            TicketRedemptionCode::Invalid => CtxErrorCode::InvalidTicket,
            TicketRedemptionCode::Expired => CtxErrorCode::TicketExpired,
            TicketRedemptionCode::Replayed => CtxErrorCode::TicketReplayed,
            TicketRedemptionCode::AccountUnavailable => CtxErrorCode::AccountUnavailable,
            TicketRedemptionCode::DeviceUnavailable => CtxErrorCode::DeviceRegistrationRequired,
            TicketRedemptionCode::CapsuleLimitReached => CtxErrorCode::CapsuleLimitReached,
            TicketRedemptionCode::AccountCapsuleLimitReached => CtxErrorCode::AccountCapsuleLimitReached,
            TicketRedemptionCode::AutomationRiskHigh => CtxErrorCode::AutomationRiskHigh,
            TicketRedemptionCode::PolicyUnsatisfied => CtxErrorCode::PolicyUnsatisfied,
            TicketRedemptionCode::Committed,
            TicketRedemptionCode::AlreadyCommitted,
            null => throw new LogicException('A committed redemption has no public error.'),
        };
    }
}
