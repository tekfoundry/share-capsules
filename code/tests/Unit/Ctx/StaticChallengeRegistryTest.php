<?php

namespace Tests\Unit\Ctx;

use App\Ctx\Challenges\ChallengeModuleStatus;
use App\Ctx\Challenges\StaticChallengeRegistry;
use PHPUnit\Framework\TestCase;

final class StaticChallengeRegistryTest extends TestCase
{
    public function test_all_v1_challenge_modules_are_active_for_selection(): void
    {
        $registry = new StaticChallengeRegistry;
        $modules = $registry->activeModules();
        $moduleIds = array_column($modules, 'id');

        $this->assertSame('ctx-challenge-set-v1.0', $registry->challengeSetVersion());
        $this->assertSame('ctx-challenge-selector-v1.0', $registry->selectorVersion());
        $this->assertSame('ctx-challenge-scoring-v1.0', $registry->scoringModelVersion());
        $this->assertSame(1, $registry->requiredModuleCount());
        $this->assertSame([
            'balance_beam',
            'cargo_sort',
            'circuit_trace',
            'memory_path',
            'pattern_repair',
            'signal_tune',
        ], $moduleIds);

        foreach ($modules as $module) {
            $this->assertSame(ChallengeModuleStatus::Active, $module->status);
            $this->assertSame(['pointer', 'touch', 'keyboard', 'reduced_motion'], $module->inputModes);
            $this->assertSame($module->id, $module->scoringAdapter);
            $this->assertSame(1, $module->selectionWeight);
        }
    }
}
