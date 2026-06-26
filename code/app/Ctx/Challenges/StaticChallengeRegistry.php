<?php

namespace App\Ctx\Challenges;

final class StaticChallengeRegistry implements ChallengeRegistry
{
    public function challengeSetVersion(): string
    {
        return 'ctx-challenge-set-v1.0';
    }

    public function selectorVersion(): string
    {
        return 'ctx-challenge-selector-v1.0';
    }

    public function scoringModelVersion(): string
    {
        return 'ctx-challenge-scoring-v1.0';
    }

    public function requiredModuleCount(): int
    {
        return 1;
    }

    /** @return list<ChallengeModuleDefinition> */
    public function activeModules(): array
    {
        return [
            $this->module('balance_beam', ['pointer', 'touch', 'keyboard', 'reduced_motion']),
            $this->module('cargo_sort', ['pointer', 'touch', 'keyboard', 'reduced_motion']),
            $this->module('circuit_trace', ['pointer', 'touch', 'keyboard', 'reduced_motion']),
            $this->module('memory_path', ['pointer', 'touch', 'keyboard', 'reduced_motion']),
            $this->module('pattern_repair', ['pointer', 'touch', 'keyboard', 'reduced_motion']),
            $this->module('signal_tune', ['pointer', 'touch', 'keyboard', 'reduced_motion']),
        ];
    }

    /** @param list<string> $inputModes */
    private function module(string $id, array $inputModes): ChallengeModuleDefinition
    {
        return new ChallengeModuleDefinition(
            id: $id,
            version: '1.0.0',
            status: ChallengeModuleStatus::Active,
            inputModes: $inputModes,
            eventSchemaVersion: '1.0.0',
            scoringAdapter: $id,
            scoringAdapterVersion: '1.0.0',
        );
    }
}
