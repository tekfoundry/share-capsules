<?php

namespace Tests\Unit\Ctx;

use App\Ctx\Metrics\CreatorSafeDenialCategory;
use App\Ctx\Metrics\CtxMetricEvent;
use App\Ctx\Metrics\CtxMetricEventType;
use App\Ctx\Metrics\CtxMetricRecorder;
use App\Models\CtxCapsuleMetricBucket;
use App\Models\CtxCapsuleMetricDenial;
use App\Models\CtxCapsuleMetricProjection;
use App\Models\CtxMetricEventRecord;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CtxMetricRecorderTest extends TestCase
{
    use RefreshDatabase;

    public function test_duplicate_delivery_projects_exactly_once(): void
    {
        $recorder = app(CtxMetricRecorder::class);
        $event = $this->event('redemption-event-0001', CtxMetricEventType::RedemptionCommitted);

        $this->assertTrue($recorder->record($event));
        $this->assertFalse($recorder->record($event));
        $this->assertSame(1, CtxMetricEventRecord::query()->count());
        $this->assertSame(1, CtxCapsuleMetricProjection::query()->value('redemption_committed'));
        $this->assertSame(1, CtxCapsuleMetricBucket::query()->value('redemption_committed'));
    }

    public function test_projection_uses_hour_buckets_and_only_safe_denial_categories(): void
    {
        $recorder = app(CtxMetricRecorder::class);
        $recorder->record($this->event('attempt-event-0000001', CtxMetricEventType::AuthorizationAttempted));
        $recorder->record($this->event(
            'denial-event-00000001',
            CtxMetricEventType::AuthorizationDenied,
            CreatorSafeDenialCategory::Eligibility,
        ));
        $recorder->record($this->event('approved-event-0000001', CtxMetricEventType::AuthorizationApproved));

        $projection = CtxCapsuleMetricProjection::query()->sole();
        $this->assertSame(1, $projection->authorization_attempts);
        $this->assertSame(1, $projection->authorization_denied);
        $this->assertSame(1, $projection->authorization_approved);
        $this->assertSame('eligibility', CtxCapsuleMetricDenial::query()->sole()->category);
        $this->assertSame(1, CtxCapsuleMetricDenial::query()->sole()->occurrences);
        $this->assertSame('2026-06-21 12:00:00', CtxCapsuleMetricBucket::query()->sole()->bucket_start->format('Y-m-d H:i:s'));

        $stored = json_encode(CtxMetricEventRecord::query()->get()->toArray(), JSON_THROW_ON_ERROR);
        foreach (['viewer_device_id', 'user_id', 'proof_jkt', 'agreement_jkt', 'ticket_sha256'] as $prohibited) {
            $this->assertStringNotContainsString($prohibited, $stored);
        }
    }

    public function test_provider_identity_is_part_of_every_projection_key(): void
    {
        $recorder = app(CtxMetricRecorder::class);
        $recorder->record($this->event('provider-one-event-01', CtxMetricEventType::AuthorizationAttempted));
        $recorder->record(new CtxMetricEvent(
            eventId: 'provider-two-event-01',
            type: CtxMetricEventType::AuthorizationAttempted,
            provider: 'https://other-provider.example',
            broker: 'https://broker.example',
            capsuleId: 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            capsuleRevision: 1,
            occurredAt: CarbonImmutable::parse('2026-06-21T12:35:00Z'),
        ));

        $this->assertSame(2, CtxCapsuleMetricProjection::query()->count());
        $this->assertSame(2, CtxCapsuleMetricBucket::query()->count());
    }

    private function event(
        string $id,
        CtxMetricEventType $type,
        ?CreatorSafeDenialCategory $denial = null,
    ): CtxMetricEvent {
        return new CtxMetricEvent(
            eventId: $id,
            type: $type,
            provider: 'https://provider.example',
            broker: 'https://broker.example',
            capsuleId: 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            capsuleRevision: 1,
            occurredAt: CarbonImmutable::parse('2026-06-21T12:34:56Z'),
            denialCategory: $denial,
        );
    }
}
