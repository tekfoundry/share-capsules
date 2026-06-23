<?php

namespace Tests\Unit\Ctx;

use App\Ctx\Metrics\CreatorSafeDenialCategory;
use App\Ctx\Metrics\CtxMetricEvent;
use App\Ctx\Metrics\CtxMetricEventType;
use Carbon\CarbonImmutable;
use InvalidArgumentException;
use Tests\TestCase;

final class CtxMetricEventTest extends TestCase
{
    public function test_the_v1_envelope_is_provider_aware_and_collects_no_optional_dimensions(): void
    {
        $event = new CtxMetricEvent(
            eventId: 'metric-event-0000000001',
            type: CtxMetricEventType::AuthorizationDenied,
            provider: 'https://provider.example',
            broker: 'https://broker.example',
            capsuleId: 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            capsuleRevision: 2,
            occurredAt: CarbonImmutable::parse('2026-06-21T12:34:56Z'),
            denialCategory: CreatorSafeDenialCategory::Limit,
        );

        $this->assertSame([
            'type' => 'ctx-metric-event',
            'version' => 1,
            'event_id' => 'metric-event-0000000001',
            'event_type' => 'authorization_denied',
            'provider' => 'https://provider.example',
            'broker' => 'https://broker.example',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 2,
            'occurred_at' => '2026-06-21T12:34:56.000+00:00',
            'denial_category' => 'limit',
            'optional_dimensions' => [],
        ], $event->envelope());
        $serialized = json_encode($event->envelope(), JSON_THROW_ON_ERROR);
        foreach ([
            'user_id', 'viewer_device', 'ticket', 'proof', 'content_key', 'ip_address',
            'user_agent', 'country', 'device_class', 'browser_family', 'os_family',
            'viewer_version',
        ] as $prohibited) {
            $this->assertStringNotContainsString($prohibited, $serialized);
        }
    }

    public function test_only_authorization_denials_can_carry_a_safe_category(): void
    {
        $this->expectException(InvalidArgumentException::class);
        new CtxMetricEvent(
            eventId: 'metric-event-0000000001',
            type: CtxMetricEventType::RedemptionCommitted,
            provider: 'https://provider.example',
            broker: 'https://broker.example',
            capsuleId: 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            capsuleRevision: 1,
            occurredAt: CarbonImmutable::now(),
            denialCategory: CreatorSafeDenialCategory::Risk,
        );
    }

    public function test_protocol_reasons_collapse_to_reviewed_creator_safe_categories(): void
    {
        $this->assertSame(CreatorSafeDenialCategory::Eligibility, CreatorSafeDenialCategory::fromProtocolCode('email_verification_required'));
        $this->assertSame(CreatorSafeDenialCategory::Limit, CreatorSafeDenialCategory::fromProtocolCode('account_capsule_limit_reached'));
        $this->assertSame(CreatorSafeDenialCategory::Risk, CreatorSafeDenialCategory::fromProtocolCode('automation_risk_high'));
        $this->assertSame(CreatorSafeDenialCategory::Availability, CreatorSafeDenialCategory::fromProtocolCode('internal_detail'));
    }
}
