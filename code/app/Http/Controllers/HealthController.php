<?php

namespace App\Http\Controllers;

use App\Support\HealthCheckService;
use Illuminate\Http\JsonResponse;

final class HealthController extends Controller
{
    public function __invoke(HealthCheckService $healthCheck): JsonResponse
    {
        $result = $healthCheck->check();

        return response()->json(
            $result,
            $result['status'] === 'healthy' ? 200 : 503,
        );
    }
}
