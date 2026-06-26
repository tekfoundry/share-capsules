<?php

namespace App\Http\Controllers\Ctx;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\View\View;

final class PatternRepairPlaygroundController extends Controller
{
    public function __invoke(Request $request): View
    {
        abort_unless(app()->environment(['local', 'testing']), 404);

        $seed = (string) $request->query('seed', (string) random_int(100000, 999999));

        return view('ctx.challenges.pattern-repair-playground', [
            'seed' => $seed,
            ...$this->target($seed),
        ]);
    }

    /** @return array{patternTiles: list<array{index: int, key: string, color: string, shape: string, label: string, broken: bool}>, patternOptions: list<array{key: string, color: string, shape: string, label: string}>, correctPatternKey: string} */
    private function target(string $seed): array
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

        $optionKeys = [$correctKey];
        for ($offset = 1; count($optionKeys) < 4; $offset += 1) {
            $color = $colors[(array_search(explode('_', $correctKey)[0], $colors, true) + $offset) % count($colors)];
            $shape = $shapes[(array_search(explode('_', $correctKey)[1], $shapes, true) + ($offset * 2)) % count($shapes)];
            $key = $color.'_'.$shape;
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
