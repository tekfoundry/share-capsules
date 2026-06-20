<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

final class AssignCorrelationId
{
    private const HEADER = 'X-Correlation-ID';

    public function handle(Request $request, Closure $next): Response
    {
        $correlationId = $this->acceptedCorrelationId($request)
            ?? (string) Str::uuid();

        $request->attributes->set('correlation_id', $correlationId);
        Log::withContext(['correlation_id' => $correlationId]);

        try {
            $response = $next($request);
            $response->headers->set(self::HEADER, $correlationId);

            return $response;
        } finally {
            Log::withoutContext(['correlation_id']);
        }
    }

    private function acceptedCorrelationId(Request $request): ?string
    {
        $candidate = $request->headers->get(self::HEADER);

        if (! is_string($candidate)) {
            return null;
        }

        return preg_match('/\A[A-Za-z0-9][A-Za-z0-9._-]{7,127}\z/', $candidate) === 1
            ? $candidate
            : null;
    }
}
