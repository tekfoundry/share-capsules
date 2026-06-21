<?php

namespace App\Http\Middleware;

use App\Broker\Audit\BrokerAuditSink;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class AuthenticateBrokerControlPlane
{
    public function __construct(
        private readonly BrokerAuditSink $audit,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('sharecapsules.broker.control_plane_token');
        $presented = $request->bearerToken();

        if (strlen($expected) < 32
            || ! is_string($presented)
            || ! hash_equals($expected, $presented)) {
            $this->audit->record('broker.control_plane_authentication_rejected', [
                'correlation_id' => $request->attributes->get('correlation_id'),
                'path' => $request->path(),
            ]);

            return new JsonResponse([
                'type' => 'ctx-error',
                'version' => 1,
                'code' => 'authentication_required',
                'retryable' => false,
            ], 401, ['Cache-Control' => 'no-store']);
        }

        return $next($request);
    }
}
