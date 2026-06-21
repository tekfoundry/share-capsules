<?php

namespace App\Http\Controllers\Ctx;

use App\Ctx\Contracts\CtxV1;
use App\Ctx\SigningKeys\TicketSigningKeyLifecycle;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

final class TicketSigningJwksController extends Controller
{
    public function __invoke(TicketSigningKeyLifecycle $keys): JsonResponse
    {
        $publicKeys = $keys->publicKeys();
        if ($publicKeys->isEmpty()) {
            return response()->json([
                'type' => 'ctx-error',
                'version' => 1,
                'code' => 'temporarily_unavailable',
                'retryable' => true,
            ], 503)->withHeaders([
                'Cache-Control' => 'no-store',
            ]);
        }

        $jwks = $publicKeys->map(fn ($key): array => [
            'kty' => 'OKP',
            'crv' => 'Ed25519',
            'x' => $key->public_key,
            'use' => 'sig',
            'alg' => CtxV1::SIGNING_ALGORITHM,
            'kid' => $key->kid,
        ])->all();

        return response()->json(['keys' => $jwks])->withHeaders([
            'Cache-Control' => 'public, max-age=30, must-revalidate',
        ]);
    }
}
