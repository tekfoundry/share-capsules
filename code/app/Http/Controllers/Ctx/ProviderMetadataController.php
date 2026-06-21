<?php

namespace App\Http\Controllers\Ctx;

use App\Ctx\Discovery\CtxProviderMetadata;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

final class ProviderMetadataController extends Controller
{
    public function __invoke(CtxProviderMetadata $metadata): JsonResponse
    {
        return response()->json($metadata->toArray())->withHeaders([
            'Cache-Control' => 'public, max-age=300',
        ]);
    }
}
