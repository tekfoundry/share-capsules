<?php

namespace Tests\Feature\Broker;

use App\Models\BrokerContentKey;
use Tests\TestCase;

final class ControlPlaneIsolationTest extends TestCase
{
    public function test_control_plane_does_not_expose_broker_protocol_or_internal_routes(): void
    {
        $this->postJson('/releases')->assertNotFound();
        $this->postJson('/registrations')->assertNotFound();
        $this->getJson('/internal/status')->assertNotFound();
    }

    public function test_control_plane_keeps_broker_storage_outside_the_default_connection(): void
    {
        $this->assertSame('control-plane', config('sharecapsules.component'));
        $this->assertNotSame('broker', config('database.default'));
        $this->assertSame('broker', (new BrokerContentKey)->getConnectionName());
        $this->assertNotSame(
            config('database.default'),
            (new BrokerContentKey)->getConnectionName(),
        );
    }
}
