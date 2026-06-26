<?php

namespace App\Http\Controllers\Ctx;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\View\View;

final class SignalTunePlaygroundController extends Controller
{
    public function __invoke(Request $request): View
    {
        abort_unless(app()->environment(['local', 'testing']), 404);

        $seed = (string) $request->query('seed', (string) random_int(100000, 999999));
        $hash = abs(crc32($seed));

        return view('ctx.challenges.signal-tune-playground', [
            'seed' => $seed,
            'targetAmplitude' => 24 + ($hash % 35),
            'targetFrequency' => 22 + (($hash >> 5) % 39),
            'targetPhase' => (($hash >> 11) % 101) - 50,
        ]);
    }
}
