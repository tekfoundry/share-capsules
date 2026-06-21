<?php

namespace App\Ctx\Metrics;

final class NativeMetricEventIdentifierSource implements MetricEventIdentifierSource
{
    public function identifier(): string
    {
        return sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }
}
