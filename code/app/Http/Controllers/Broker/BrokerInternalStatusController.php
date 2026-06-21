<?php

namespace App\Http\Controllers\Broker;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

final class BrokerInternalStatusController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'status' => 'ready',
            'component' => 'broker',
        ]);
    }
}
