<?php

namespace App\Showcase;

final readonly class ShowcaseGenerationResult
{
    public function __construct(
        public string $slug,
        public string $outputPath,
        public string $capsuleId,
        public string $registrationId,
        public string $releaseHandle,
        public string $archiveSha256,
        public int $archiveBytes,
        public bool $verified,
        public bool $revoked,
    ) {}
}
