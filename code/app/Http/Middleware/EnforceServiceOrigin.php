<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnforceServiceOrigin
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $brokerHost = $this->hostFromUrl((string) config('sharecapsules.broker.base_url'));
        $ctxHost = $this->hostFromUrl((string) config('sharecapsules.ctx.issuer'));

        if ($brokerHost === null || $ctxHost === null || hash_equals($brokerHost, $ctxHost)) {
            return $next($request);
        }

        $isBrokerHost = hash_equals($brokerHost, $request->getHost());
        $isBrokerPath = in_array($request->path(), [
            '.well-known/ctx-configuration',
            'up',
            'registrations',
            'releases',
            'internal/status',
            'internal/release-bindings/validate',
            'internal/content-keys/lifecycle',
        ], true);

        if ($isBrokerPath && ! $isBrokerHost && $request->path() !== '.well-known/ctx-configuration' && $request->path() !== 'up') {
            abort(404);
        }

        if ($isBrokerHost && ! $isBrokerPath) {
            abort(404);
        }

        return $next($request);
    }

    private function hostFromUrl(string $url): ?string
    {
        $host = parse_url($url, PHP_URL_HOST);

        return is_string($host) && $host !== '' ? $host : null;
    }
}
