<?php

namespace App\Showcase;

final readonly class ShowcaseCapsulePrepareInput
{
    /** @param array<string, mixed> $draftPolicy */
    public function __construct(
        public string $slug,
        public string $title,
        public string $description,
        public array $draftPolicy,
        public string $sourcePath,
        public string $statePath,
        public string $contentKeyPath,
        public string $ctxIssuer,
        public string $automationRiskIssuer,
    ) {}
}
