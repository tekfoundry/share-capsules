<?php

namespace App\Http\Middleware;

use App\OAuth\Dpop\DpopProof;
use App\OAuth\Dpop\DpopProofValidator;
use App\OAuth\Dpop\InvalidDpopProof;
use Closure;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

final readonly class ValidateTokenEndpointDpop
{
    public function __construct(private DpopProofValidator $validator) {}

    public function handle(Request $request, Closure $next): Response
    {
        $compactProof = $request->header('DPoP');
        $requiresProof = $request->string('grant_type')->toString() === 'refresh_token'
            || $request->filled('device_id');

        if (! is_string($compactProof) || $compactProof === '') {
            return $requiresProof ? $this->invalid() : $next($request);
        }

        try {
            $request->attributes->set(
                DpopProof::class,
                $this->validator->validateTokenEndpoint($request, $compactProof),
            );
        } catch (InvalidDpopProof) {
            return $this->invalid();
        }

        if ($request->string('grant_type')->toString() !== 'refresh_token') {
            return $next($request);
        }

        $refreshToken = $request->string('refresh_token')->toString();
        if ($refreshToken === '') {
            return $next($request);
        }

        try {
            return Cache::lock(
                'oauth:refresh:'.hash('sha256', $refreshToken),
                (int) config('sharecapsules.oauth.refresh_lock_seconds'),
            )->block(
                (int) config('sharecapsules.oauth.refresh_lock_wait_seconds'),
                fn (): Response => $next($request),
            );
        } catch (LockTimeoutException) {
            return response()->json([
                'error' => 'temporarily_unavailable',
                'error_description' => 'The refresh request could not be safely serialized.',
            ], 503, ['Cache-Control' => 'no-store', 'Pragma' => 'no-cache']);
        }
    }

    private function invalid(): JsonResponse
    {
        return response()->json([
            'error' => 'invalid_dpop_proof',
            'error_description' => 'A fresh proof from the registered Viewer device is required.',
        ], 400, ['Cache-Control' => 'no-store', 'Pragma' => 'no-cache']);
    }
}
