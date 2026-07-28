<?php

namespace Tests\Unit\Broker;

use App\Broker\Support\BrokerDeploymentConfiguration;
use Tests\TestCase;

final class BrokerDeploymentConfigurationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set(
            'sharecapsules.broker.kms.local_master_key',
            'base64:YnJva2VyLWxvY2FsLWttcy1rZXktMzItYnl0ZXMhISE=',
        );
    }

    public function test_broker_requires_dedicated_storage_credentials_and_audit_channel(): void
    {
        config()->set('sharecapsules.component', 'broker');
        config()->set('database.default', 'broker');
        config()->set('database.connections.mysql.database', 'shared');
        config()->set('database.connections.mysql.username', 'shared_user');
        config()->set('database.connections.broker.database', 'shared');
        config()->set('database.connections.broker.username', 'shared_user');
        config()->set('sharecapsules.broker.control_plane_token', 'short');
        config()->set('sharecapsules.broker.audit_channel', config('logging.default'));

        $this->assertEqualsCanonicalizing([
            'broker_database_not_isolated',
            'broker_database_credentials_not_isolated',
            'broker_control_plane_token_invalid',
            'broker_audit_channel_not_isolated',
        ], app(BrokerDeploymentConfiguration::class)->issues());
    }

    public function test_broker_accepts_distinct_boundaries(): void
    {
        config()->set('sharecapsules.component', 'broker');
        config()->set('database.default', 'broker');
        config()->set('database.connections.mysql.database', 'application');
        config()->set('database.connections.mysql.username', 'application_user');
        config()->set('database.connections.broker.database', 'broker');
        config()->set('database.connections.broker.username', 'broker_user');
        config()->set('sharecapsules.broker.control_plane_token', 'a-dedicated-32-byte-broker-token!');
        config()->set('sharecapsules.broker.audit_channel', 'broker_audit');

        $this->assertSame([], app(BrokerDeploymentConfiguration::class)->issues());
    }

    public function test_same_install_control_plane_component_accepts_broker_boundaries(): void
    {
        config()->set('sharecapsules.component', 'control-plane');
        config()->set('database.default', 'mysql');
        config()->set('database.connections.mysql.database', 'application');
        config()->set('database.connections.mysql.username', 'application_user');
        config()->set('database.connections.broker.database', 'broker');
        config()->set('database.connections.broker.username', 'broker_user');
        config()->set('sharecapsules.broker.control_plane_token', 'a-dedicated-32-byte-broker-token!');
        config()->set('sharecapsules.broker.audit_channel', 'broker_audit');

        $this->assertSame([], app(BrokerDeploymentConfiguration::class)->issues());
    }

    public function test_production_rejects_the_local_key_custody_driver_by_default(): void
    {
        config()->set('sharecapsules.component', 'broker');
        config()->set('sharecapsules.deployment.environment', 'production');
        config()->set('sharecapsules.broker.kms.driver', 'local');

        $this->assertContains(
            'broker_kms_not_managed',
            app(BrokerDeploymentConfiguration::class)->issues(),
        );
    }

    public function test_production_accepts_explicitly_approved_local_key_custody(): void
    {
        config()->set('sharecapsules.component', 'broker');
        config()->set('sharecapsules.deployment.environment', 'production');
        config()->set('sharecapsules.broker.kms.driver', 'local');
        config()->set('sharecapsules.broker.kms.key_id', 'production-prototype-local-key-0001');
        config()->set('sharecapsules.broker.kms.allow_local_in_production', true);

        $this->assertNotContains(
            'broker_kms_not_managed',
            app(BrokerDeploymentConfiguration::class)->issues(),
        );
    }
}
