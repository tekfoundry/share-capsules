<?php

namespace Tests\Unit\Broker;

use App\Broker\Release\ProviderJwksTicketPublicKeyResolver;
use App\Broker\Release\TicketPublicKeyUnavailable;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class ProviderJwksTicketPublicKeyResolverTest extends TestCase
{
    public function test_it_caches_successful_provider_jwks_lookups_briefly(): void
    {
        Cache::flush();
        $keypair = sodium_crypto_sign_keypair();
        $public = sodium_crypto_sign_publickey($keypair);
        $x = sodium_bin2base64($public, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
        Http::fake(['https://provider.example.test/ctx/jwks.json' => Http::response([
            'keys' => [[
                'kty' => 'OKP',
                'crv' => 'Ed25519',
                'x' => $x,
                'use' => 'sig',
                'alg' => 'EdDSA',
                'kid' => 'provider-key-0001',
            ]],
        ])]);

        $resolver = new ProviderJwksTicketPublicKeyResolver(app(Factory::class), app(CacheRepository::class));

        $this->assertSame($public, $resolver->resolve('https://provider.example.test', 'provider-key-0001'));
        $this->assertSame($public, $resolver->resolve('https://provider.example.test', 'provider-key-0001'));
        Http::assertSentCount(1);
    }

    public function test_it_reports_provider_key_fetch_failures_as_temporarily_unavailable(): void
    {
        Cache::flush();
        Http::fake(['https://provider.example.test/ctx/jwks.json' => Http::response([], 503)]);

        $this->expectException(TicketPublicKeyUnavailable::class);

        (new ProviderJwksTicketPublicKeyResolver(app(Factory::class), app(CacheRepository::class)))
            ->resolve('https://provider.example.test', 'provider-key-0001');
    }
}
