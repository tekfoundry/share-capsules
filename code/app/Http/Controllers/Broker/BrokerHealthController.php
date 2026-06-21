<?php

namespace App\Http\Controllers\Broker;

use App\Broker\Support\BrokerHealthCheck;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

final class BrokerHealthController extends Controller
{
    public function __invoke(BrokerHealthCheck $health): JsonResponse
    {
        $result = $health->check();

        return response()->json($result, $result['status'] === 'healthy' ? 200 : 503);
    }
}
