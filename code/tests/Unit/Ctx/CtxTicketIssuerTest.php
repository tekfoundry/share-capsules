<?php

namespace Tests\Unit\Ctx;

use App\Ctx\SigningKeys\TicketSigningKeyLifecycle;
use App\Ctx\Tickets\CtxTicketBindings;
use App\Ctx\Tickets\CtxTicketIssuer;
use App\Ctx\Tickets\TicketIdentifierSource;
use App\Ctx\Tickets\TicketIssuanceFailed;
use App\Models\CtxAuthorizationTicket;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

final class CtxTicketIssuerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_signs_an_exact_sixty_second_ticket_and_keeps_identity_private(): void
    {
        $now = CarbonImmutable::parse('2026-06-21T18:00:00Z');
        $key = app(TicketSigningKeyLifecycle::class)->stage($now->subMinute());
        app(TicketSigningKeyLifecycle::class)->activate($key->kid, $now->subSeconds(30));
        [$user, $device] = $this->userAndDevice();
        $identifier = str_repeat('t', 43);
        $issuer = new CtxTicketIssuer(new class($identifier) implements TicketIdentifierSource
        {
            public function __construct(private readonly string $identifier) {}

            public function identifier(): string
            {
                return $this->identifier;
            }
        });

        $bindings = $this->bindings($device);
        $issued = $issuer->issue($user, $device, $bindings, $now);
        [$encodedHeader, $encodedClaims, $encodedSignature] = explode('.', $issued->compact);
        $header = $this->decodeJson($encodedHeader);
        $claims = $this->decodeJson($encodedClaims);
        $signature = sodium_base642bin($encodedSignature, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
        $publicKey = sodium_base642bin($key->public_key, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);

        $this->assertSame([
            'typ' => 'ctx-key-release+jwt',
            'alg' => 'EdDSA',
            'kid' => $key->kid,
        ], $header);
        $this->assertSame((string) config('sharecapsules.ctx.issuer'), $claims['iss']);
        $this->assertSame('https://broker.example.test', $claims['aud']);
        $this->assertSame($identifier, $claims['jti']);
        $this->assertSame($claims['iat'], $claims['nbf']);
        $this->assertSame(60, $claims['exp'] - $claims['iat']);
        $this->assertSame($bindings->publicClaims(), $claims['ctx']);
        $this->assertTrue(sodium_crypto_sign_verify_detached(
            $signature,
            $encodedHeader.'.'.$encodedClaims,
            $publicKey,
        ));
        $this->assertSame($now->addSeconds(60)->getTimestamp(), $issued->expiresAt->getTimestamp());

        $stored = CtxAuthorizationTicket::query()->sole();
        $this->assertSame($user->getKey(), $stored->user_id);
        $this->assertSame($device->getKey(), $stored->viewer_device_id);
        $this->assertSame('pending', $stored->status);
        $this->assertArrayNotHasKey('sub', $claims);
        $this->assertStringNotContainsString('user_id', $issued->compact);
    }

    public function test_it_fails_closed_without_exactly_one_active_signing_key(): void
    {
        [$user, $device] = $this->userAndDevice();

        $this->expectException(TicketIssuanceFailed::class);
        app(CtxTicketIssuer::class)->issue($user, $device, $this->bindings($device));
    }

    /** @return array{User, ViewerDevice} */
    private function userAndDevice(): array
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $device = ViewerDevice::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'name' => 'Viewer',
            'proof_public_key' => $this->digest(),
            'proof_jkt' => $this->digest(),
            'agreement_public_key' => $this->digest(),
            'agreement_jkt' => $this->digest(),
            'status' => ViewerDeviceStatus::Active,
        ]);

        return [$user, $device];
    }

    private function bindings(ViewerDevice $device): CtxTicketBindings
    {
        return new CtxTicketBindings(
            broker: 'https://broker.example.test',
            capsuleId: 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            capsuleRevision: 1,
            policySha256: $this->digest(),
            payloadId: 'primary-image',
            releaseHandle: 'opaque-release-handle-0001',
            proofJkt: $device->proof_jkt,
            agreementJkt: $device->agreement_jkt,
            capsuleLifetimeLimit: 5,
            accountCapsuleLifetimeLimit: 3,
        );
    }

    private function digest(): string
    {
        return sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }

    /** @return array<string, mixed> */
    private function decodeJson(string $value): array
    {
        return json_decode(
            sodium_base642bin($value, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING),
            true,
            flags: JSON_THROW_ON_ERROR,
        );
    }
}
