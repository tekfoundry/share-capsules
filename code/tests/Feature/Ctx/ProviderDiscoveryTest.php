<?php

namespace Tests\Feature\Ctx;

use App\Ctx\SigningKeys\TicketSigningKeyLifecycle;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ProviderDiscoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_provider_metadata_publishes_the_exact_v1_contract_without_creating_a_session(): void
    {
        config()->set('sharecapsules.ctx.issuer', 'https://ctx.example.test');

        $response = $this->getJson('/.well-known/ctx-configuration');

        $response
            ->assertOk()
            ->assertHeader('Cache-Control', 'max-age=300, public')
            ->assertHeaderMissing('Set-Cookie')
            ->assertExactJson([
                'issuer' => 'https://ctx.example.test',
                'protocol_versions_supported' => ['ctx-1'],
                'authorization_endpoint' => 'https://ctx.example.test/ctx/authorize',
                'ticket_redemption_endpoint' => 'https://ctx.example.test/ctx/tickets/redeem',
                'jwks_uri' => 'https://ctx.example.test/ctx/jwks.json',
                'ticket_types_supported' => ['ctx-key-release+jwt'],
                'ticket_signing_alg_values_supported' => ['EdDSA'],
                'dpop_signing_alg_values_supported' => ['EdDSA'],
            ]);
    }

    public function test_jwks_exposes_only_exact_public_purpose_bound_ed25519_keys(): void
    {
        $key = app(TicketSigningKeyLifecycle::class)->stage(
            CarbonImmutable::parse('2026-06-21T12:00:00Z'),
        );

        $response = $this->getJson('/ctx/jwks.json');

        $response
            ->assertOk()
            ->assertHeader('Cache-Control', 'max-age=30, must-revalidate, public')
            ->assertHeaderMissing('Set-Cookie')
            ->assertExactJson([
                'keys' => [[
                    'kty' => 'OKP',
                    'crv' => 'Ed25519',
                    'x' => $key->public_key,
                    'use' => 'sig',
                    'alg' => 'EdDSA',
                    'kid' => $key->kid,
                ]],
            ]);

        $this->assertArrayNotHasKey('encrypted_private_key', $response->json('keys.0'));
        $this->assertArrayNotHasKey('d', $response->json('keys.0'));
    }

    public function test_jwks_fails_closed_when_no_signing_key_has_been_published(): void
    {
        $this->getJson('/ctx/jwks.json')
            ->assertStatus(503)
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertExactJson([
                'type' => 'ctx-error',
                'version' => 1,
                'code' => 'temporarily_unavailable',
                'retryable' => true,
            ]);
    }
}
