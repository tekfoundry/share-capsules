<?php

namespace App\Ctx\Metrics;

use App\Models\CtxCapsuleMetricBucket;
use App\Models\CtxCapsuleMetricDenial;
use App\Models\CtxCapsuleMetricProjection;
use App\Models\CtxMetricEventRecord;
use Illuminate\Support\Facades\DB;

final class CtxMetricRecorder
{
    public function record(CtxMetricEvent $event): bool
    {
        return DB::transaction(function () use ($event): bool {
            $inserted = CtxMetricEventRecord::query()->insertOrIgnore([
                'event_id' => $event->eventId,
                'schema_version' => CtxMetricEvent::SCHEMA_VERSION,
                'event_type' => $event->type->value,
                'provider' => $event->provider,
                'provider_key' => $this->providerKey($event->provider),
                'broker' => $event->broker,
                'capsule_id' => $event->capsuleId,
                'capsule_revision' => $event->capsuleRevision,
                'denial_category' => $event->denialCategory?->value,
                'optional_dimensions' => json_encode([], JSON_THROW_ON_ERROR),
                'occurred_at' => $event->occurredAt,
                'projected_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            if ($inserted === 0) {
                return false;
            }

            $projection = $this->projection($event);
            $column = $this->column($event->type);
            $projection->increment($column);
            if ($projection->fresh_through === null
                || $projection->fresh_through->lessThan($event->occurredAt)) {
                $projection->forceFill(['fresh_through' => $event->occurredAt])->save();
            }

            if ($this->bucketed($event->type)) {
                $this->bucket($event)->increment($column);
            }
            if ($event->denialCategory !== null) {
                $this->denial($event)->increment('occurrences');
            }

            return true;
        }, 3);
    }

    private function projection(CtxMetricEvent $event): CtxCapsuleMetricProjection
    {
        CtxCapsuleMetricProjection::query()->insertOrIgnore([
            'provider' => $event->provider,
            'provider_key' => $this->providerKey($event->provider),
            'capsule_id' => $event->capsuleId,
            'capsule_revision' => $event->capsuleRevision,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return CtxCapsuleMetricProjection::query()
            ->where('provider_key', $this->providerKey($event->provider))
            ->where('capsule_id', $event->capsuleId)
            ->where('capsule_revision', $event->capsuleRevision)
            ->lockForUpdate()
            ->firstOrFail();
    }

    private function bucket(CtxMetricEvent $event): CtxCapsuleMetricBucket
    {
        $bucketStart = $event->occurredAt->startOfHour();
        CtxCapsuleMetricBucket::query()->insertOrIgnore([
            'provider' => $event->provider,
            'provider_key' => $this->providerKey($event->provider),
            'capsule_id' => $event->capsuleId,
            'capsule_revision' => $event->capsuleRevision,
            'bucket_start' => $bucketStart,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return CtxCapsuleMetricBucket::query()
            ->where('provider_key', $this->providerKey($event->provider))
            ->where('capsule_id', $event->capsuleId)
            ->where('capsule_revision', $event->capsuleRevision)
            ->where('bucket_start', $bucketStart)
            ->lockForUpdate()
            ->firstOrFail();
    }

    private function denial(CtxMetricEvent $event): CtxCapsuleMetricDenial
    {
        CtxCapsuleMetricDenial::query()->insertOrIgnore([
            'provider' => $event->provider,
            'provider_key' => $this->providerKey($event->provider),
            'capsule_id' => $event->capsuleId,
            'capsule_revision' => $event->capsuleRevision,
            'category' => $event->denialCategory?->value,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return CtxCapsuleMetricDenial::query()
            ->where('provider_key', $this->providerKey($event->provider))
            ->where('capsule_id', $event->capsuleId)
            ->where('capsule_revision', $event->capsuleRevision)
            ->where('category', $event->denialCategory?->value)
            ->lockForUpdate()
            ->firstOrFail();
    }

    private function column(CtxMetricEventType $type): string
    {
        return match ($type) {
            CtxMetricEventType::AuthorizationAttempted => 'authorization_attempts',
            CtxMetricEventType::AuthorizationApproved => 'authorization_approved',
            CtxMetricEventType::AuthorizationDenied => 'authorization_denied',
            CtxMetricEventType::RedemptionCommitted => 'redemption_committed',
            CtxMetricEventType::TicketRejected => 'ticket_rejected',
            CtxMetricEventType::CapsuleRevoked => 'capsule_revoked',
            CtxMetricEventType::ReleasePaused => 'release_paused',
        };
    }

    private function bucketed(CtxMetricEventType $type): bool
    {
        return ! in_array($type, [
            CtxMetricEventType::CapsuleRevoked,
            CtxMetricEventType::ReleasePaused,
        ], true);
    }

    private function providerKey(string $provider): string
    {
        return sodium_bin2base64(
            hash('sha256', $provider, true),
            SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
        );
    }
}
