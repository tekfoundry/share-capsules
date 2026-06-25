<?php

namespace Tests\Unit\Broker;

use App\Broker\Release\TicketRedemptionOutcome;
use App\Ctx\Contracts\CtxErrorCode;
use App\Ctx\Tickets\TicketRedemptionCode;
use LogicException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class TicketRedemptionOutcomeTest extends TestCase
{
    #[DataProvider('publicErrors')]
    public function test_each_private_redemption_result_maps_to_one_reviewed_public_code(
        TicketRedemptionCode $private,
        CtxErrorCode $public,
    ): void {
        $outcome = TicketRedemptionOutcome::responded($private);

        $this->assertFalse($outcome->committed());
        $this->assertSame($public, $outcome->publicError());
    }

    /** @return iterable<string, array{TicketRedemptionCode, CtxErrorCode}> */
    public static function publicErrors(): iterable
    {
        yield 'invalid' => [TicketRedemptionCode::Invalid, CtxErrorCode::InvalidTicket];
        yield 'expired' => [TicketRedemptionCode::Expired, CtxErrorCode::TicketExpired];
        yield 'replayed' => [TicketRedemptionCode::Replayed, CtxErrorCode::TicketReplayed];
        yield 'account' => [TicketRedemptionCode::AccountUnavailable, CtxErrorCode::AccountUnavailable];
        yield 'device' => [TicketRedemptionCode::DeviceUnavailable, CtxErrorCode::DeviceRegistrationRequired];
        yield 'capsule limit' => [TicketRedemptionCode::CapsuleLimitReached, CtxErrorCode::CapsuleLimitReached];
        yield 'account limit' => [TicketRedemptionCode::AccountCapsuleLimitReached, CtxErrorCode::AccountCapsuleLimitReached];
        yield 'risk' => [TicketRedemptionCode::AutomationRiskHigh, CtxErrorCode::AutomationRiskHigh];
        yield 'policy' => [TicketRedemptionCode::PolicyUnsatisfied, CtxErrorCode::PolicyUnsatisfied];
    }

    public function test_unavailable_and_committed_outcomes_are_unambiguous(): void
    {
        $unavailable = TicketRedemptionOutcome::unavailable();
        $this->assertFalse($unavailable->committed());
        $this->assertSame(CtxErrorCode::TemporarilyUnavailable, $unavailable->publicError());

        $committed = TicketRedemptionOutcome::responded(TicketRedemptionCode::Committed);
        $this->assertTrue($committed->committed());

        $alreadyCommitted = TicketRedemptionOutcome::responded(TicketRedemptionCode::AlreadyCommitted);
        $this->assertTrue($alreadyCommitted->committed());

        $this->expectException(LogicException::class);
        $committed->publicError();
    }
}
