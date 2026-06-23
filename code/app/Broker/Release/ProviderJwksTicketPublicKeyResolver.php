<?php

namespace App\Broker\Release;

use App\Ctx\Contracts\ServiceIdentity;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Http\Client\Factory;
use Throwable;

final readonly class ProviderJwksTicketPublicKeyResolver implements TicketPublicKeyResolver
{
    public function __construct(
        private Factory $http,
        private CacheRepository $cache,
    ) {}

    public function resolve(string $issuer, string $kid): string
    {
        try {
            ServiceIdentity::fromString($issuer);
            $internal = (string) (config('sharecapsules.ctx.internal_url') ?: $issuer);
            $keys = $this->keys($issuer, $internal);
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
        } catch (TicketPublicKeyUnavailable $exception) {
            throw $exception;
        } catch (InvalidKeyRelease $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            throw new TicketPublicKeyUnavailable('The provider signing keys are temporarily unavailable.', 0, $exception);
        }
    }

    /** @return list<array<string, mixed>> */
    private function keys(string $issuer, string $internal): array
    {
        return $this->cache->remember(
            'sharecapsules:ctx:jwks:'.hash('sha256', $issuer.'|'.$internal),
            now()->addSeconds(30),
            function () use ($internal): array {
                $url = rtrim($internal, '/').'/ctx/jwks.json';
                $response = $this->http->acceptJson()->timeout(5)->retry(1, 100, throw: false)->get($url);
                if (! $response->successful()) {
                    throw new TicketPublicKeyUnavailable('The provider signing keys could not be fetched.');
                }
                $keys = $response->json('keys');
                if (! is_array($keys) || ! array_is_list($keys) || count($keys) > 16) {
                    throw new TicketPublicKeyUnavailable('The provider signing key set is malformed.');
                }

                return $keys;
            },
        );
    }
}
