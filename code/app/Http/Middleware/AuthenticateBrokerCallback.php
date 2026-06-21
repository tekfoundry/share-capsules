<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

final class AuthenticateBrokerCallback
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('sharecapsules.broker.callback_token');
        $presented = $request->bearerToken();

        if (strlen($expected) < 32 || ! is_string($presented) || ! hash_equals($expected, $presented)) {
            Log::notice('broker.callback_authentication_rejected', [
                'correlation_id' => $request->attributes->get('correlation_id'),
                'path' => $request->path(),
            ]);

            return new JsonResponse(['error' => 'invalid_broker_credential'], 401, [
                'Cache-Control' => 'no-store',
            ]);
        }

        return $next($request);
    }
}
