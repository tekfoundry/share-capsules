<?php

namespace App\Http\Controllers\Broker;

use App\Broker\Discovery\BrokerMetadata;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

final class BrokerMetadataController extends Controller
{
    public function __invoke(BrokerMetadata $metadata): JsonResponse
    {
        return response()->json($metadata->toArray())->withHeaders([
            'Cache-Control' => 'public, max-age=300',
        ]);
    }
}
