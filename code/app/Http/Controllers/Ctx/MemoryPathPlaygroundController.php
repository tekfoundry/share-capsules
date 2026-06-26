<?php

namespace App\Http\Controllers\Ctx;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\View\View;

final class MemoryPathPlaygroundController extends Controller
{
    public function __invoke(Request $request): View
    {
        abort_unless(app()->environment(['local', 'testing']), 404);

        $seed = (string) $request->query('seed', (string) random_int(100000, 999999));

        return view('ctx.challenges.memory-path-playground', [
            'seed' => $seed,
            'memorySequence' => $this->sequence($seed),
        ]);
    }

    /** @return list<string> */
    private function sequence(string $seed): array
    {
        $directions = ['red', 'yellow', 'blue', 'green'];
        $sequence = [];
        for ($index = 0; $index < 32; $index += 1) {
            $sequence[] = $directions[abs(crc32($seed.'-'.$index)) % count($directions)];
        }

        return $sequence;
    }
}
