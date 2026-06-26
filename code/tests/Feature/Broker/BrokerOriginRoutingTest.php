<?php

namespace Tests\Feature\Broker;

use App\Broker\Audit\BrokerAuditSink;
use Illuminate\Foundation\Application;
use Tests\TestCase;

final class BrokerOriginRoutingTest extends TestCase
{
    public function createApplication(): Application
    {
        putenv('SHARECAPSULES_CTX_ISSUER=https://app.example.test');
        putenv('SHARECAPSULES_BROKER_URL=https://broker.example.test');
        $_ENV['SHARECAPSULES_CTX_ISSUER'] = 'https://app.example.test';
        $_ENV['SHARECAPSULES_BROKER_URL'] = 'https://broker.example.test';
        $_SERVER['SHARECAPSULES_CTX_ISSUER'] = 'https://app.example.test';
        $_SERVER['SHARECAPSULES_BROKER_URL'] = 'https://broker.example.test';

        /** @var Application $application */
        $application = parent::createApplication();

        return $application;
    }

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('database.connections.mysql.database', 'application_test');
        config()->set('database.connections.mysql.username', 'application_test_user');
        config()->set('database.connections.broker', [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'username' => 'broker_test_user',
            'prefix' => '',
            'foreign_key_constraints' => true,
        ]);
        config()->set('sharecapsules.broker.control_plane_token', 'test-broker-control-plane-token-0001');
        config()->set('sharecapsules.broker.audit_channel', 'broker_audit');
        config()->set(
            'sharecapsules.broker.kms.local_master_key',
            'base64:YnJva2VyLWxvY2FsLWttcy1rZXktMzItYnl0ZXMhISE=',
        );
    }

    public function test_broker_host_serves_the_broker_route_surface(): void
    {
        $this->getJson('https://broker.example.test/.well-known/ctx-configuration')
            ->assertOk()
            ->assertExactJson([
                'broker' => 'https://broker.example.test',
                'protocol_versions_supported' => ['ctx-1'],
                'key_release_endpoint' => 'https://broker.example.test/releases',
                'ticket_types_supported' => ['ctx-key-release+jwt'],
                'cryptographic_suites_supported' => ['ctx-capsule-v1'],
            ]);

        $this->getJson('https://broker.example.test/up')
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

    public function test_broker_host_does_not_serve_control_plane_routes(): void
    {
        $this->get('https://broker.example.test/')
            ->assertNotFound();

        $this->postJson('https://broker.example.test/oauth/token')
            ->assertNotFound();
    }

    public function test_app_host_does_not_serve_broker_routes(): void
    {
        $this->getJson('https://app.example.test/.well-known/ctx-configuration')
            ->assertOk()
            ->assertJsonPath('issuer', 'https://app.example.test');

        $this->postJson('https://app.example.test/releases')
            ->assertNotFound();
    }

    public function test_same_install_broker_internal_routes_still_require_the_service_token(): void
    {
        $this->getJson('https://broker.example.test/internal/status')
            ->assertUnauthorized()
            ->assertExactJson([
                'type' => 'ctx-error',
                'version' => 1,
                'code' => 'authentication_required',
                'retryable' => false,
            ]);

        $this->withToken('test-broker-control-plane-token-0001')
            ->getJson('https://broker.example.test/internal/status')
            ->assertOk()
            ->assertExactJson([
                'status' => 'ready',
                'component' => 'broker',
            ]);
    }

    public function test_same_install_release_errors_do_not_echo_sensitive_inputs(): void
    {
        $secrets = [
            'ticket' => 'raw-authorization-ticket-that-must-not-echo',
            'proof' => 'raw-dpop-proof-that-must-not-echo',
            'agreement_public_key' => 'raw-agreement-key-that-must-not-echo',
            'release_handle' => 'raw-release-handle-that-must-not-echo',
            'content_key' => 'raw-content-key-that-must-not-echo',
        ];

        $response = $this->postJson('https://broker.example.test/releases', $secrets)
            ->assertBadRequest()
            ->assertExactJson([
                'type' => 'ctx-error',
                'version' => 1,
                'code' => 'invalid_request',
                'retryable' => false,
            ]);

        foreach ($secrets as $secret) {
            $this->assertStringNotContainsString($secret, (string) $response->getContent());
        }
    }

    public function test_same_install_broker_release_route_uses_broker_throttle(): void
    {
        for ($attempt = 1; $attempt <= 60; $attempt++) {
            $this->postJson('https://broker.example.test/releases', [
                'ticket' => 'invalid-ticket',
                'proof' => 'invalid-proof',
                'agreement_public_key' => 'invalid-agreement-key',
            ])->assertBadRequest();
        }

        $this->postJson('https://broker.example.test/releases', [
            'ticket' => 'invalid-ticket',
            'proof' => 'invalid-proof',
            'agreement_public_key' => 'invalid-agreement-key',
        ])->assertTooManyRequests();
    }

    public function test_same_install_rejected_broker_credentials_are_audited_without_the_credential(): void
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

        $this->withToken($presentedCredential)
            ->getJson('https://broker.example.test/internal/status')
            ->assertUnauthorized();

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

    public static function tearDownAfterClass(): void
    {
        putenv('SHARECAPSULES_CTX_ISSUER');
        putenv('SHARECAPSULES_BROKER_URL');
        unset(
            $_ENV['SHARECAPSULES_CTX_ISSUER'],
            $_ENV['SHARECAPSULES_BROKER_URL'],
            $_SERVER['SHARECAPSULES_CTX_ISSUER'],
            $_SERVER['SHARECAPSULES_BROKER_URL'],
        );

        parent::tearDownAfterClass();
    }
}
