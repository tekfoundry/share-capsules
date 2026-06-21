<?php

namespace App\OAuth\Dpop;

use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Http\Request;
use JsonException;

final readonly class DpopProofValidator
{
    private const MAX_AGE_SECONDS = 60;

    private const CLOCK_SKEW_SECONDS = 5;

    public function __construct(private CacheRepository $cache) {}

    public function validateTokenEndpoint(Request $request, string $compactProof): DpopProof
    {
        return $this->validate($request, $compactProof, null);
    }

    public function validateProtectedRequest(
        Request $request,
        string $compactProof,
        string $accessToken,
    ): DpopProof {
        return $this->validate($request, $compactProof, $accessToken);
    }

    private function validate(
        Request $request,
        string $compactProof,
        ?string $accessToken,
    ): DpopProof {
        $segments = explode('.', $compactProof);

        if (count($segments) !== 3 || in_array('', $segments, true)) {
            throw new InvalidDpopProof;
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $segments;
        $header = $this->decodeObject($encodedHeader);
        $payload = $this->decodeObject($encodedPayload);

        $this->assertExactKeys($header, ['alg', 'jwk', 'typ']);

        if (($header['typ'] ?? null) !== 'dpop+jwt' || ($header['alg'] ?? null) !== 'EdDSA'
            || ! is_array($header['jwk'] ?? null)) {
            throw new InvalidDpopProof;
        }

        /** @var array<string, mixed> $jwk */
        $jwk = $header['jwk'];
        $this->assertExactKeys($jwk, ['crv', 'kty', 'x']);
        $x = $jwk['x'] ?? null;

        if (($jwk['kty'] ?? null) !== 'OKP' || ($jwk['crv'] ?? null) !== 'Ed25519'
            || ! is_string($x)) {
            throw new InvalidDpopProof;
        }

        $allowedPayloadKeys = ['htm', 'htu', 'iat', 'jti'];
        if ($accessToken !== null) {
            $allowedPayloadKeys[] = 'ath';
        }
        if (array_key_exists('nonce', $payload)) {
            $allowedPayloadKeys[] = 'nonce';
        }
        $this->assertExactKeys($payload, $allowedPayloadKeys);

        $jti = $payload['jti'] ?? null;
        $iat = $payload['iat'] ?? null;
        $now = now()->timestamp;

        if (! is_string($jti) || $jti === '' || strlen($jti) > 128
            || ($payload['htm'] ?? null) !== 'POST'
            || ($payload['htu'] ?? null) !== $this->expectedTarget($request)
            || ! is_int($iat)
            || $iat > $now + self::CLOCK_SKEW_SECONDS
            || $iat < $now - self::MAX_AGE_SECONDS - self::CLOCK_SKEW_SECONDS
            || (isset($payload['nonce']) && (! is_string($payload['nonce']) || $payload['nonce'] === ''))) {
            throw new InvalidDpopProof;
        }

        if ($accessToken !== null && (! is_string($payload['ath'] ?? null)
            || ! hash_equals($this->base64Url(hash('sha256', $accessToken, true)), $payload['ath']))) {
            throw new InvalidDpopProof;
        }

        $publicKey = $this->decodeBase64Url($x, SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES);
        $signature = $this->decodeBase64Url($encodedSignature, SODIUM_CRYPTO_SIGN_BYTES);

        if (! sodium_crypto_sign_verify_detached(
            $signature,
            $encodedHeader.'.'.$encodedPayload,
            $publicKey,
        )) {
            throw new InvalidDpopProof;
        }

        $thumbprint = $this->base64Url(hash(
            'sha256',
            json_encode(['crv' => 'Ed25519', 'kty' => 'OKP', 'x' => $x], JSON_THROW_ON_ERROR),
            true,
        ));
        $replayKey = 'oauth:dpop:'.hash('sha256', $thumbprint."\0".$jti);

        if (! $this->cache->add($replayKey, true, self::MAX_AGE_SECONDS + self::CLOCK_SKEW_SECONDS)) {
            throw new InvalidDpopProof;
        }

        return new DpopProof($jti, $thumbprint, $x);
    }

    /** @return array<string, mixed> */
    private function decodeObject(string $encoded): array
    {
        try {
            $decoded = json_decode($this->decodeBase64Url($encoded), true, 8, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new InvalidDpopProof;
        }

        if (! is_array($decoded) || array_is_list($decoded)) {
            throw new InvalidDpopProof;
        }

        return $decoded;
    }

    /** @param array<string, mixed> $value
     * @param  list<string>  $expected
     */
    private function assertExactKeys(array $value, array $expected): void
    {
        $keys = array_keys($value);
        sort($keys);
        sort($expected);

        if ($keys !== $expected) {
            throw new InvalidDpopProof;
        }
    }

    private function decodeBase64Url(string $value, ?int $expectedLength = null): string
    {
        if ($value === '' || preg_match('/^[A-Za-z0-9_-]+$/', $value) !== 1) {
            throw new InvalidDpopProof;
        }

        $decoded = base64_decode(strtr($value, '-_', '+/'), true);

        if ($decoded === false || ($expectedLength !== null && strlen($decoded) !== $expectedLength)
            || ! hash_equals($value, $this->base64Url($decoded))) {
            throw new InvalidDpopProof;
        }

        return $decoded;
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function expectedTarget(Request $request): string
    {
        $baseUrl = rtrim((string) config('app.url'), '/');

        if (filter_var($baseUrl, FILTER_VALIDATE_URL) === false) {
            throw new InvalidDpopProof;
        }

        return $baseUrl.$request->getPathInfo();
    }
}
