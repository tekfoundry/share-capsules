<?php

namespace App\Http\Middleware;

use App\Models\ViewerDevice;
use App\OAuth\Dpop\DpopProofValidator;
use App\OAuth\Dpop\InvalidDpopProof;
use App\ViewerDevices\ViewerDeviceStatus;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Passport\Passport;
use Symfony\Component\HttpFoundation\Response;

final readonly class ValidateDpopAccessToken
{
    public function __construct(private DpopProofValidator $validator) {}

    public function handle(Request $request, Closure $next): Response
    {
        $authorization = $request->header('Authorization');
        $compactProof = $request->header('DPoP');

        if (! is_string($authorization) || preg_match('/^DPoP ([^\s]+)$/', $authorization, $match) !== 1
            || ! is_string($compactProof) || $compactProof === '') {
            return $this->invalid();
        }

        $accessToken = $match[1];

        try {
            $proof = $this->validator->validateProtectedRequest($request, $compactProof, $accessToken);
            [$header, $claims] = $this->jwtParts($accessToken);
        } catch (InvalidDpopProof) {
            return $this->invalid();
        }

        $tokenId = $claims['jti'] ?? null;
        $confirmation = $claims['cnf']['jkt'] ?? null;

        if (($header['typ'] ?? null) !== 'at+jwt' || ($header['alg'] ?? null) !== 'RS256'
            || ($claims['iss'] ?? null) !== rtrim((string) config('app.url'), '/')
            || ! is_string($tokenId) || ! is_string($confirmation)
            || ! hash_equals($proof->thumbprint, $confirmation)) {
            return $this->invalid();
        }

        $token = Passport::token()->newQuery()
            ->whereKey($tokenId)
            ->where('proof_jkt', $proof->thumbprint)
            ->where('revoked', false)
            ->first();

        if ($token === null || $token->getAttribute('viewer_device_id') === null
            || ! ViewerDevice::query()
                ->whereKey($token->getAttribute('viewer_device_id'))
                ->where('proof_jkt', $proof->thumbprint)
                ->where('status', ViewerDeviceStatus::Active)
                ->exists()) {
            return $this->invalid();
        }

        $request->headers->set('Authorization', 'Bearer '.$accessToken);

        return $next($request);
    }

    /** @return array{array<string, mixed>, array<string, mixed>} */
    private function jwtParts(string $token): array
    {
        $segments = explode('.', $token);

        if (count($segments) !== 3) {
            throw new InvalidDpopProof;
        }

        $header = $this->decodePart($segments[0]);
        $claims = $this->decodePart($segments[1]);

        return [$header, $claims];
    }

    /** @return array<string, mixed> */
    private function decodePart(string $encoded): array
    {
        if ($encoded === '' || preg_match('/^[A-Za-z0-9_-]+$/', $encoded) !== 1) {
            throw new InvalidDpopProof;
        }

        $decoded = base64_decode(strtr($encoded, '-_', '+/'), true);
        $value = $decoded === false ? null : json_decode($decoded, true);

        if (! is_array($value) || array_is_list($value)) {
            throw new InvalidDpopProof;
        }

        return $value;
    }

    private function invalid(): JsonResponse
    {
        return response()->json(['error' => 'invalid_dpop_proof'], 401, [
            'Cache-Control' => 'no-store',
            'Pragma' => 'no-cache',
            'WWW-Authenticate' => 'DPoP error="invalid_dpop_proof"',
        ]);
    }
}
