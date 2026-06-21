<?php

namespace App\Ctx\Metrics;

use App\Ctx\Contracts\ServiceIdentity;
use Carbon\CarbonImmutable;
use InvalidArgumentException;

final readonly class CtxMetricEvent
{
    public const SCHEMA_VERSION = 1;

    public function __construct(
        public string $eventId,
        public CtxMetricEventType $type,
        public string $provider,
        public ?string $broker,
        public string $capsuleId,
        public int $capsuleRevision,
        public CarbonImmutable $occurredAt,
        public ?CreatorSafeDenialCategory $denialCategory = null,
    ) {
        if (preg_match('/\A[A-Za-z0-9_-]{16,128}\z/', $eventId) !== 1
            || preg_match('/\Aurn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\z/', $capsuleId) !== 1
            || $capsuleRevision < 1) {
            throw new InvalidArgumentException('The CTX metric event binding is invalid.');
        }
        ServiceIdentity::fromString($provider);
        if ($broker !== null) {
            ServiceIdentity::fromString($broker);
        }
        if (($type === CtxMetricEventType::AuthorizationDenied) !== ($denialCategory !== null)) {
            throw new InvalidArgumentException('Only authorization denials carry a creator-safe category.');
        }
    }

    /** @return array<string, mixed> */
    public function envelope(): array
    {
        return [
            'type' => 'ctx-metric-event',
            'version' => self::SCHEMA_VERSION,
            'event_id' => $this->eventId,
            'event_type' => $this->type->value,
            'provider' => $this->provider,
            'broker' => $this->broker,
            'capsule_id' => $this->capsuleId,
            'capsule_revision' => $this->capsuleRevision,
            'occurred_at' => $this->occurredAt->format(DATE_RFC3339_EXTENDED),
            'denial_category' => $this->denialCategory?->value,
            'optional_dimensions' => [],
        ];
    }

    public static function deterministicIdentifier(string $domain, string $value): string
    {
        return sodium_bin2base64(
            hash('sha256', "ctx-metric-event-v1\0{$domain}\0{$value}", true),
            SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
        );
    }
}
