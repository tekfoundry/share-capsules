<?php

namespace Tests\Feature\Broker;

use App\Broker\Audit\BrokerAuditSink;
use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
use Tests\BrokerTestCase;

#[RunTestsInSeparateProcesses]
#[PreserveGlobalState(false)]
final class BrokerBoundaryTest extends BrokerTestCase
{
    public function test_broker_boots_only_its_public_protocol_and_internal_api_routes(): void
    {
        $this->getJson('/')->assertNotFound();
        $this->postJson('/oauth/token')->assertNotFound();
        $this->postJson('/api/viewer-devices')->assertNotFound();

        $this->getJson('/.well-known/ctx-configuration')
            ->assertOk()
            ->assertExactJson([
                'broker' => 'https://broker.example.test',
                'protocol_versions_supported' => ['ctx-1'],
                'key_release_endpoint' => 'https://broker.example.test/releases',
                'ticket_types_supported' => ['ctx-key-release+jwt'],
                'cryptographic_suites_supported' => ['ctx-capsule-v1'],
            ]);

        $this->postJson('/releases')
            ->assertBadRequest()
            ->assertExactJson([
                'type' => 'ctx-error',
                'version' => 1,
                'code' => 'invalid_request',
                'retryable' => false,
            ]);
    }

    public function test_internal_api_requires_the_dedicated_broker_credential(): void
    {
        $this->app->instance(BrokerAuditSink::class, new class implements BrokerAuditSink
        {
            public function record(string $event, array $context = []): void {}
        });

        $this->getJson('/internal/status')
            ->assertUnauthorized()
            ->assertExactJson([
                'type' => 'ctx-error',
                'version' => 1,
                'code' => 'authentication_required',
                'retryable' => false,
            ]);

        $this->withToken('wrong-control-plane-credential')
            ->getJson('/internal/status')
            ->assertUnauthorized();

        $this->withToken('test-broker-control-plane-token-0001')
            ->getJson('/internal/status')
            ->assertOk()
            ->assertExactJson([
                'status' => 'ready',
                'component' => 'broker',
            ]);
    }

    public function test_health_checks_only_broker_configuration_and_storage(): void
    {
        $this->getJson('/up')
            ->assertOk()
            ->assertExactJson([
                'status' => 'healthy',
                'component' => 'broker',
                'services' => [
                    'configuration' => ['status' => 'healthy'],
                    'storage' => ['status' => 'healthy'],
                ],
            ]);
    }

    public function test_rejected_credentials_are_audited_without_recording_the_credential(): void
    {
        $audit = new class implements BrokerAuditSink
        {
            /** @var list<array{event: string, context: array<string, bool|int|string|null>}> */
            public array $records = [];

            public function record(string $event, array $context = []): void
            {
                $this->records[] = compact('event', 'context');
            }
        };
        $this->app->instance(BrokerAuditSink::class, $audit);
        $presentedCredential = 'credential-that-must-never-enter-the-audit-event';

        $this->withToken($presentedCredential)->getJson('/internal/status')->assertUnauthorized();

        $this->assertCount(1, $audit->records);
        $this->assertSame(
            'broker.control_plane_authentication_rejected',
            $audit->records[0]['event'],
        );
        $this->assertStringNotContainsString(
            $presentedCredential,
            json_encode($audit->records, JSON_THROW_ON_ERROR),
        );
    }
}
