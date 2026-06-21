<?php

namespace App\Ctx\Metrics;

interface MetricEventIdentifierSource
{
    public function identifier(): string;
}
