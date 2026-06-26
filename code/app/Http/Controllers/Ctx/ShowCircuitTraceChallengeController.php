<?php

namespace App\Http\Controllers\Ctx;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ctx\CreateChallengeAttemptRequest;
use App\Models\CtxChallengeAttempt;
use App\Models\CtxChallengeAttemptModule;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\View\View;

final class ShowCircuitTraceChallengeController extends Controller
{
    public function __invoke(Request $request, string $attempt): View
    {
        $returnTo = $request->query('return_to');
        abort_unless(is_string($returnTo) && CreateChallengeAttemptRequest::isChallengeReturnUrl($returnTo), 404);

        $attempt = CtxChallengeAttempt::query()
            ->with('modules')
            ->findOrFail($attempt);
        $module = CtxChallengeAttemptModule::query()
            ->where('ctx_challenge_attempt_id', $attempt->getKey())
            ->whereNull('completed_at')
            ->orderBy('id')
            ->first();
        abort_unless($module !== null, 404);

        $view = match ($module->challenge_id) {
            'balance_beam' => 'ctx.challenges.balance-beam-playground',
            'cargo_sort' => 'ctx.challenges.cargo-sort-playground',
            'circuit_trace' => 'ctx.challenges.circuit-trace',
            'memory_path' => 'ctx.challenges.memory-path-playground',
            'pattern_repair' => 'ctx.challenges.pattern-repair-playground',
            'signal_tune' => 'ctx.challenges.signal-tune-playground',
            default => abort(404),
        };

        return view($view, [
            'attempt' => $attempt,
            'module' => $module,
            'challengeModules' => $attempt->modules
                ->sortBy('id')
                ->values()
                ->map(fn (CtxChallengeAttemptModule $selectedModule): array => [
                    'id' => $selectedModule->challenge_id,
                    'name' => $this->displayName($selectedModule->challenge_id),
                    'version' => $selectedModule->module_version,
                    'inputModes' => $selectedModule->input_modes ?? [],
                    'status' => $selectedModule->completed_at === null ? 'current' : 'complete',
                ])
                ->all(),
            'isAvailable' => $attempt->status === 'pending' && $attempt->expires_at->greaterThan(CarbonImmutable::now()),
            'completionUrl' => URL::temporarySignedRoute(
                match ($module->challenge_id) {
                    'balance_beam' => 'ctx.challenge-attempts.balance-beam.complete',
                    'cargo_sort' => 'ctx.challenge-attempts.cargo-sort.complete',
                    'memory_path' => 'ctx.challenge-attempts.memory-path.complete',
                    'pattern_repair' => 'ctx.challenge-attempts.pattern-repair.complete',
                    'signal_tune' => 'ctx.challenge-attempts.signal-tune.complete',
                    default => 'ctx.challenge-attempts.circuit-trace.complete',
                },
                $attempt->expires_at,
                [
                    'attempt' => $attempt->getKey(),
                    'return_to' => $returnTo,
                ],
            ),
            'returnTo' => $returnTo,
            'showLiveScore' => CreateChallengeAttemptRequest::isLocalChallengePlaygroundReturnUrl($returnTo),
            'seed' => (string) $attempt->getKey(),
            ...$this->balanceBeamTarget((string) $attempt->getKey()),
            ...$this->signalTuneTarget((string) $attempt->getKey()),
            ...$this->cargoSortTarget((string) $attempt->getKey()),
            ...$this->memoryPathTarget((string) $attempt->getKey()),
            ...$this->patternRepairTarget((string) $attempt->getKey()),
        ]);
    }

    private function displayName(string $challengeId): string
    {
        return match ($challengeId) {
            'balance_beam' => 'Balance Beam',
            'cargo_sort' => 'Cargo Sort',
            'circuit_trace' => 'Circuit Trace',
            'memory_path' => 'Memory Path',
            'pattern_repair' => 'Pattern Repair',
            'signal_tune' => 'Signal Tune',
            default => str($challengeId)->replace('_', ' ')->title()->toString(),
        };
    }

    /** @return array{forcePhase: float, forceRate: float, forceStrength: float} */
    private function balanceBeamTarget(string $seed): array
    {
        $hash = abs(crc32($seed));

        return [
            'forcePhase' => ($hash % 628) / 100,
            'forceRate' => 0.7 + (($hash >> 7) % 40) / 100,
            'forceStrength' => 0.18 + (($hash >> 13) % 18) / 100,
        ];
    }

    /** @return array{targetAmplitude: int, targetFrequency: int, targetPhase: int} */
    private function signalTuneTarget(string $seed): array
    {
        $hash = abs(crc32($seed));

        return [
            'targetAmplitude' => 24 + ($hash % 35),
            'targetFrequency' => 22 + (($hash >> 5) % 39),
            'targetPhase' => (($hash >> 11) % 101) - 50,
        ];
    }

    /** @return array{cargoRuleBreakAt: int, cargoBins: list<array{kind: string, value: string, label: string}>, cargoItems: list<array{id: string, shape: string, color: string, label: string}>} */
    private function cargoSortTarget(string $seed): array
    {
        $shapes = ['circle', 'square', 'triangle'];
        $colors = ['blue', 'green', 'gold', 'rose'];
        $items = [];
        for ($index = 0; $index < 9; $index += 1) {
            $hash = abs(crc32($seed.'-'.$index));
            $shape = $shapes[$hash % count($shapes)];
            $color = $colors[($hash >> 4) % count($colors)];
            $items[] = [
                'id' => 'cargo-'.$index,
                'shape' => $shape,
                'color' => $color,
                'label' => ucfirst($color).' '.ucfirst($shape),
            ];
        }

        return [
            'cargoRuleBreakAt' => 4,
            'cargoBins' => [
                ['kind' => 'shape', 'value' => 'circle', 'label' => 'Circle bin'],
                ['kind' => 'shape', 'value' => 'square', 'label' => 'Square bin'],
                ['kind' => 'shape', 'value' => 'triangle', 'label' => 'Triangle bin'],
                ['kind' => 'color', 'value' => 'blue', 'label' => 'Blue bin'],
                ['kind' => 'color', 'value' => 'green', 'label' => 'Green bin'],
                ['kind' => 'color', 'value' => 'gold', 'label' => 'Gold bin'],
                ['kind' => 'color', 'value' => 'rose', 'label' => 'Rose bin'],
            ],
            'cargoItems' => $items,
        ];
    }

    /** @return array{memorySequence: list<string>} */
    private function memoryPathTarget(string $seed): array
    {
        $directions = ['red', 'yellow', 'blue', 'green'];
        $sequence = [];
        for ($index = 0; $index < 32; $index += 1) {
            $sequence[] = $directions[abs(crc32($seed.'-'.$index)) % count($directions)];
        }

        return ['memorySequence' => $sequence];
    }

    /** @return array{patternTiles: list<array{index: int, key: string, color: string, shape: string, label: string, broken: bool}>, patternOptions: list<array{key: string, color: string, shape: string, label: string}>, correctPatternKey: string} */
    private function patternRepairTarget(string $seed): array
    {
        $colors = ['blue', 'green', 'gold', 'rose'];
        $shapes = ['circle', 'square', 'triangle', 'diamond'];
        $hash = abs(crc32($seed));
        $colorOffset = $hash % count($colors);
        $shapeOffset = ($hash >> 4) % count($shapes);
        $brokenIndex = 5 + (($hash >> 9) % 6);
        $tiles = [];
        $correctKey = '';

        for ($index = 0; $index < 16; $index += 1) {
            $row = intdiv($index, 4);
            $column = $index % 4;
            $color = $colors[($row + ($column * 2) + $colorOffset) % count($colors)];
            $shape = $shapes[(($row * 2) + $column + $shapeOffset) % count($shapes)];
            $key = $color.'_'.$shape;
            if ($index === $brokenIndex) {
                $correctKey = $key;
            }

            $tiles[] = [
                'index' => $index,
                'key' => $key,
                'color' => $color,
                'shape' => $shape,
                'label' => ucfirst($color).' '.ucfirst($shape),
                'broken' => $index === $brokenIndex,
            ];
        }

        $parts = explode('_', $correctKey);
        $optionKeys = [$correctKey];
        for ($offset = 1; count($optionKeys) < 4; $offset += 1) {
            $colorIndex = (int) array_search($parts[0], $colors, true);
            $shapeIndex = (int) array_search($parts[1], $shapes, true);
            $key = $colors[($colorIndex + $offset) % count($colors)]
                .'_'.
                $shapes[($shapeIndex + ($offset * 2)) % count($shapes)];
            if (! in_array($key, $optionKeys, true)) {
                $optionKeys[] = $key;
            }
        }

        usort($optionKeys, fn (string $left, string $right): int => crc32($seed.$left) <=> crc32($seed.$right));

        return [
            'patternTiles' => $tiles,
            'patternOptions' => array_map(fn (string $key): array => [
                'key' => $key,
                'color' => explode('_', $key)[0],
                'shape' => explode('_', $key)[1],
                'label' => ucfirst(explode('_', $key)[0]).' '.ucfirst(explode('_', $key)[1]),
            ], $optionKeys),
            'correctPatternKey' => $correctKey,
        ];
    }
}
