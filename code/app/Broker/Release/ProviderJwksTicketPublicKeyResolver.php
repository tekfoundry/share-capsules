<?php

namespace App\Broker\Release;

use App\Ctx\Contracts\ServiceIdentity;
use Illuminate\Http\Client\Factory;
use Throwable;

final readonly class ProviderJwksTicketPublicKeyResolver implements TicketPublicKeyResolver
{
    public function __construct(private Factory $http) {}

    public function resolve(string $issuer, string $kid): string
    {
        try {
            ServiceIdentity::fromString($issuer);
            $internal = (string) (config('sharecapsules.ctx.internal_url') ?: $issuer);
            $url = rtrim($internal, '/').'/ctx/jwks.json';
            $response = $this->http->acceptJson()->timeout(5)->retry(1, 100, throw: false)->get($url);
            $keys = $response->successful() ? $response->json('keys') : null;
            if (! is_array($keys) || ! array_is_list($keys) || count($keys) > 16) {
                throw new InvalidKeyRelease;
            }
            foreach ($keys as $key) {
                if (! is_array($key) || ($key['kid'] ?? null) !== $kid) {
                    continue;
                }
                $actual = array_keys($key);
                sort($actual);
                if ($actual !== ['alg', 'crv', 'kid', 'kty', 'use', 'x']
                    || $key['kty'] !== 'OKP' || $key['crv'] !== 'Ed25519'
                    || $key['use'] !== 'sig' || $key['alg'] !== 'EdDSA' || ! is_string($key['x'])) {
                    throw new InvalidKeyRelease;
                }
                $decoded = sodium_base642bin($key['x'], SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
                if (strlen($decoded) !== 32) {
                    throw new InvalidKeyRelease;
                }

                return $decoded;
            }
            throw new InvalidKeyRelease;
        } catch (InvalidKeyRelease $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            throw new InvalidKeyRelease('The provider signing key is unavailable.', 0, $exception);
        }
    }
}
