<?php

namespace Tests\Unit\Ctx;

use App\Ctx\Contracts\CtxErrorCode;
use App\Ctx\Metrics\CreatorSafeDenialCategory;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class CtxDenialContractTest extends TestCase
{
    public function test_public_error_codes_are_the_exact_closed_v1_set(): void
    {
        $this->assertSame([
            'invalid_request',
            'authentication_required',
            'email_verification_required',
            'account_unavailable',
            'device_registration_required',
            'consent_required',
            'policy_unsatisfied',
            'capsule_limit_reached',
            'account_capsule_limit_reached',
            'automation_risk_high',
            'unsupported_contract',
            'invalid_proof',
            'invalid_ticket',
            'ticket_expired',
            'ticket_replayed',
            'release_unavailable',
            'temporarily_unavailable',
        ], array_column(CtxErrorCode::cases(), 'value'));
    }

    #[DataProvider('creatorCategories')]
    public function test_creator_projection_receives_only_a_coarse_reviewed_category(
        CtxErrorCode $error,
        CreatorSafeDenialCategory $category,
    ): void {
        $this->assertSame($category, CreatorSafeDenialCategory::fromProtocolCode($error->value));
        $this->assertNotSame($error->value, $category->value);
    }

    /** @return iterable<string, array{CtxErrorCode, CreatorSafeDenialCategory}> */
    public static function creatorCategories(): iterable
    {
        foreach (CtxErrorCode::cases() as $error) {
            yield $error->value => [$error, match ($error) {
                CtxErrorCode::AuthenticationRequired,
                CtxErrorCode::EmailVerificationRequired,
                CtxErrorCode::AccountUnavailable,
                CtxErrorCode::DeviceRegistrationRequired => CreatorSafeDenialCategory::Eligibility,
                CtxErrorCode::ConsentRequired => CreatorSafeDenialCategory::Consent,
                CtxErrorCode::CapsuleLimitReached,
                CtxErrorCode::AccountCapsuleLimitReached => CreatorSafeDenialCategory::Limit,
                CtxErrorCode::AutomationRiskHigh => CreatorSafeDenialCategory::Risk,
                CtxErrorCode::InvalidRequest,
                CtxErrorCode::PolicyUnsatisfied,
                CtxErrorCode::UnsupportedContract => CreatorSafeDenialCategory::Policy,
                CtxErrorCode::InvalidProof,
                CtxErrorCode::InvalidTicket,
                CtxErrorCode::TicketExpired,
                CtxErrorCode::TicketReplayed => CreatorSafeDenialCategory::Ticket,
                CtxErrorCode::ReleaseUnavailable,
                CtxErrorCode::TemporarilyUnavailable => CreatorSafeDenialCategory::Availability,
            }];
        }
    }
}
