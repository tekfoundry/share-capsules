<?php

namespace Tests\Unit\Broker;

use App\Broker\Lifecycle\BrokerContentKeyLifecycleFailed;
use App\Broker\Lifecycle\HttpBrokerContentKeyLifecycle;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class HttpBrokerContentKeyLifecycleTest extends TestCase
{
    public function test_it_sends_authenticated_closed_world_lifecycle_commands(): void
    {
        Http::fake([
            'https://broker-internal.example.test/internal/content-keys/lifecycle' => Http::response([
                'applied' => true,
            ]),
        ]);
        config()->set('sharecapsules.broker.internal_url', 'https://broker-internal.example.test');
        config()->set('sharecapsules.broker.control_plane_token', 'control-plane-secret');
        $lifecycle = new HttpBrokerContentKeyLifecycle(app(Factory::class));

        $lifecycle->pauseCreator(42);
        $lifecycle->revokeCapsule(42, 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703', 3);
        $lifecycle->destroyCapsule(42, 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703', 3);
        $lifecycle->destroyCreator(42);

        Http::assertSentCount(4);
        Http::assertSent(fn ($request): bool => $request->hasHeader('Authorization', 'Bearer control-plane-secret')
            && $request->data() === ['operation' => 'pause_creator', 'creator_id' => '42']);
        Http::assertSent(fn ($request): bool => $request->data() === [
            'operation' => 'revoke_capsule',
            'creator_id' => '42',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 3,
        ]);
        Http::assertSent(fn ($request): bool => $request->data() === [
            'operation' => 'destroy_capsule',
            'creator_id' => '42',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 3,
        ]);
    }

    public function test_it_fails_closed_when_the_broker_does_not_confirm_application(): void
    {
        Http::fake(['*' => Http::response(['applied' => false], 503)]);
        config()->set('sharecapsules.broker.internal_url', 'https://broker-internal.example.test');
        $lifecycle = new HttpBrokerContentKeyLifecycle(app(Factory::class));

        $this->expectException(BrokerContentKeyLifecycleFailed::class);

        $lifecycle->destroyCreator(42);
    }
}
