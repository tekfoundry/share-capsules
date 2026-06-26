<?php

namespace App\Ctx\Challenges;

final readonly class ChallengeModuleDefinition
{
    /** @param list<string> $inputModes */
    public function __construct(
        public string $id,
        public string $version,
        public ChallengeModuleStatus $status,
        public array $inputModes,
        public string $eventSchemaVersion,
        public string $scoringAdapter,
        public string $scoringAdapterVersion,
        public int $selectionWeight = 1,
    ) {}
}
