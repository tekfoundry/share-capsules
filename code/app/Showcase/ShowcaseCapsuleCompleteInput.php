<?php

namespace App\Showcase;

final readonly class ShowcaseCapsuleCompleteInput
{
    public function __construct(
        public string $statePath,
        public string $archivePath,
        public string $releaseHandle,
        public string $broker,
    ) {}
}
