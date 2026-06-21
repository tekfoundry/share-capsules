<?php

namespace Tests;

use Illuminate\Foundation\Application;
use Tests\TestCase as ApplicationTestCase;

abstract class BrokerTestCase extends ApplicationTestCase
{
    public function createApplication(): Application
    {
        putenv('SHARECAPSULES_COMPONENT=broker');
        $_ENV['SHARECAPSULES_COMPONENT'] = 'broker';
        $_SERVER['SHARECAPSULES_COMPONENT'] = 'broker';

        /** @var Application $application */
        $application = parent::createApplication();

        return $application;
    }

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('database.default', 'broker');
        config()->set('database.connections.mysql.database', 'application_test');
        config()->set('database.connections.mysql.username', 'application_test_user');
        config()->set('database.connections.broker', [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'username' => 'broker_test_user',
            'prefix' => '',
            'foreign_key_constraints' => true,
        ]);
        config()->set('sharecapsules.broker.base_url', 'https://broker.example.test');
        config()->set('sharecapsules.broker.control_plane_token', 'test-broker-control-plane-token-0001');
        config()->set('sharecapsules.broker.audit_channel', 'broker_audit');
        config()->set(
            'sharecapsules.broker.kms.local_master_key',
            'base64:YnJva2VyLWxvY2FsLWttcy1rZXktMzItYnl0ZXMhISE=',
        );
    }

    public static function tearDownAfterClass(): void
    {
        putenv('SHARECAPSULES_COMPONENT');
        unset($_ENV['SHARECAPSULES_COMPONENT'], $_SERVER['SHARECAPSULES_COMPONENT']);

        parent::tearDownAfterClass();
    }
}
