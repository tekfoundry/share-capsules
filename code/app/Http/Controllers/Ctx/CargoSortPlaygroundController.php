<?php

namespace App\Http\Controllers\Ctx;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\View\View;

final class CargoSortPlaygroundController extends Controller
{
    public function __invoke(Request $request): View
    {
        abort_unless(app()->environment(['local', 'testing']), 404);

        $seed = (string) $request->query('seed', (string) random_int(100000, 999999));

        return view('ctx.challenges.cargo-sort-playground', [
            'seed' => $seed,
            'cargoRuleBreakAt' => 4,
            'cargoBins' => $this->bins(),
            'cargoItems' => $this->items($seed),
        ]);
    }

    /** @return list<array{kind: string, value: string, label: string}> */
    private function bins(): array
    {
        return [
            ['kind' => 'shape', 'value' => 'circle', 'label' => 'Circle bin'],
            ['kind' => 'shape', 'value' => 'square', 'label' => 'Square bin'],
            ['kind' => 'shape', 'value' => 'triangle', 'label' => 'Triangle bin'],
            ['kind' => 'color', 'value' => 'blue', 'label' => 'Blue bin'],
            ['kind' => 'color', 'value' => 'green', 'label' => 'Green bin'],
            ['kind' => 'color', 'value' => 'gold', 'label' => 'Gold bin'],
            ['kind' => 'color', 'value' => 'rose', 'label' => 'Rose bin'],
        ];
    }

    /** @return list<array{id: string, shape: string, color: string, label: string}> */
    private function items(string $seed): array
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

        return $items;
    }
}
