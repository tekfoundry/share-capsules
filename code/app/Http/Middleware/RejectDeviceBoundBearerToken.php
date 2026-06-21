<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Passport\Passport;
use Symfony\Component\HttpFoundation\Response;

final class RejectDeviceBoundBearerToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        $tokenId = is_string($token) ? $this->tokenIdentifier($token) : null;

        if ($tokenId !== null && Passport::token()->newQuery()
            ->whereKey($tokenId)
            ->whereNotNull('viewer_device_id')
            ->exists()) {
            return response()->json(['error' => 'invalid_token'], 401, [
                'Cache-Control' => 'no-store',
                'WWW-Authenticate' => 'DPoP error="invalid_token"',
            ]);
        }

        return $next($request);
    }

    private function tokenIdentifier(string $token): ?string
    {
        $segments = explode('.', $token);

        if (count($segments) !== 3 || preg_match('/^[A-Za-z0-9_-]+$/', $segments[1]) !== 1) {
            return null;
        }

        $decoded = base64_decode(strtr($segments[1], '-_', '+/'), true);
        $claims = $decoded === false ? null : json_decode($decoded, true);

        return is_array($claims) && is_string($claims['jti'] ?? null) ? $claims['jti'] : null;
    }
}
