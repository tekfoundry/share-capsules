<?php

namespace Tests\Feature\Broker;

use App\Broker\Keys\KeyProtectionService;
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

    public function test_control_plane_has_neither_broker_key_custody_nor_content_key_access(): void
    {
        $this->assertFalse($this->app->bound(KeyProtectionService::class));
        $this->assertNull(config('sharecapsules.broker.kms.local_master_key'));
        $this->assertSame('broker', (new BrokerContentKey)->getConnectionName());
        $this->assertNotSame(
            config('database.default'),
            (new BrokerContentKey)->getConnectionName(),
        );
    }
}
