<?php

namespace Tests\Unit\Broker;

use App\Broker\Registration\ControlPlaneRegistrationGrantAuthorizer;
use App\Broker\Registration\RegistrationAuthorizationFailed;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class ControlPlaneRegistrationGrantAuthorizerTest extends TestCase
{
    public function test_it_sends_the_bound_hash_over_the_authenticated_internal_channel(): void
    {
        config()->set('sharecapsules.broker.control_plane_internal_url', 'https://control.example.test');
        config()->set('sharecapsules.broker.callback_token', 'callback-secret-that-must-not-leak-0001');
        Http::fake([
            'https://control.example.test/*' => Http::response([
                'type' => 'broker-registration-principal',
                'version' => 1,
                'creator_id' => 'creator-42',
                'capsule_revision' => 1,
                'policy_sha256' => str_repeat('p', 43),
            ]),
        ]);

        $principal = (new ControlPlaneRegistrationGrantAuthorizer(app(Factory::class)))->authorize(
            str_repeat('g', 43),
            'registration_0000000001',
            'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'primary-image',
            str_repeat('h', 43),
        );

        $this->assertSame('creator-42', $principal->creatorId);
        $this->assertSame(1, $principal->capsuleRevision);
        $this->assertSame(str_repeat('p', 43), $principal->policySha256);
        Http::assertSent(fn ($request): bool => $request->url()
            === 'https://control.example.test/internal/broker/registration-grants/redeem'
            && $request->hasHeader('Authorization', 'Bearer callback-secret-that-must-not-leak-0001')
            && $request['content_key_sha256'] === str_repeat('h', 43)
            && ! isset($request['content_key']));
    }

    public function test_it_fails_closed_on_an_invalid_response(): void
    {
        Http::fake(fn () => Http::response(['error' => 'invalid_registration_grant'], 401));

        $this->expectException(RegistrationAuthorizationFailed::class);
        (new ControlPlaneRegistrationGrantAuthorizer(app(Factory::class)))->authorize(
            str_repeat('g', 43),
            'registration_0000000001',
            'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'primary-image',
            str_repeat('h', 43),
        );
    }
}
