<?php

namespace App\Http\Controllers\Broker;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

final class UnavailableKeyReleaseController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'type' => 'ctx-error',
            'version' => 1,
            'code' => 'release_unavailable',
            'retryable' => false,
        ], 501, ['Cache-Control' => 'no-store']);
    }
}
