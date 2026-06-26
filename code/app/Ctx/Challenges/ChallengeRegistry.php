<?php

namespace App\Ctx\Challenges;

interface ChallengeRegistry
{
    public function challengeSetVersion(): string;

    public function selectorVersion(): string;

    public function scoringModelVersion(): string;

    public function requiredModuleCount(): int;

    /** @return list<ChallengeModuleDefinition> */
    public function activeModules(): array;
}
