<?php

namespace App\Broker\Lifecycle;

use App\Ctx\Metrics\CtxMetricEvent;
use App\Ctx\Metrics\CtxMetricEventType;
use App\Ctx\Metrics\CtxMetricRecorder;
use App\Models\User;
use Carbon\CarbonImmutable;
use Throwable;

final readonly class CapsuleRevocationService
{
    public function __construct(
        private BrokerContentKeyLifecycle $broker,
        private CtxMetricRecorder $metrics,
    ) {}

    public function revoke(User $creator, string $capsuleId, int $capsuleRevision): void
    {
        $this->broker->revokeCapsule((int) $creator->getKey(), $capsuleId, $capsuleRevision);
        $now = CarbonImmutable::now();
        try {
            $this->metrics->record(new CtxMetricEvent(
                eventId: CtxMetricEvent::deterministicIdentifier(
                    'capsule-revoked',
                    config('sharecapsules.ctx.issuer').'\0'.$capsuleId.'\0'.$capsuleRevision,
                ),
                type: CtxMetricEventType::CapsuleRevoked,
                provider: (string) config('sharecapsules.ctx.issuer'),
                broker: (string) config('sharecapsules.broker.base_url'),
                capsuleId: $capsuleId,
                capsuleRevision: $capsuleRevision,
                occurredAt: $now,
            ));
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
