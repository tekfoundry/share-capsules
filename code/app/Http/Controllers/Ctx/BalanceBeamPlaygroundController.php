<?php

namespace App\Http\Controllers\Ctx;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\View\View;

final class BalanceBeamPlaygroundController extends Controller
{
    public function __invoke(Request $request): View
    {
        abort_unless(app()->environment(['local', 'testing']), 404);

        $seed = (string) $request->query('seed', (string) random_int(100000, 999999));
        $hash = abs(crc32($seed));

        return view('ctx.challenges.balance-beam-playground', [
            'seed' => $seed,
            'forcePhase' => ($hash % 628) / 100,
            'forceRate' => 0.7 + (($hash >> 7) % 40) / 100,
            'forceStrength' => 0.18 + (($hash >> 13) % 18) / 100,
        ]);
    }
}
