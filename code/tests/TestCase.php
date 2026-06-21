<?php

namespace Tests;

use App\Broker\Lifecycle\BrokerContentKeyLifecycle;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\File;
use Laravel\Passport\Passport;
use RuntimeException;
use Tests\Support\FakeBrokerContentKeyLifecycle;
use Tests\Support\TestDatabaseGuard;

abstract class TestCase extends BaseTestCase
{
    public function createApplication(): Application
    {
        /** @var Application $application */
        $application = parent::createApplication();
        $configuration = $application->make('config');
        $connection = (string) $configuration->get('database.default');

        TestDatabaseGuard::assertSafe(
            environment: $application->environment(),
            driver: (string) $configuration->get("database.connections.{$connection}.driver"),
            database: (string) $configuration->get("database.connections.{$connection}.database"),
            expectedTestDatabase: self::environmentValue('SHARECAPSULES_TEST_DATABASE_GUARD'),
            developmentDatabase: self::environmentValue('SHARECAPSULES_DEVELOPMENT_DATABASE_GUARD'),
        );

        return $application;
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->app->instance(BrokerContentKeyLifecycle::class, new FakeBrokerContentKeyLifecycle);
        $this->configureTestPassportKeys();
    }

    private function configureTestPassportKeys(): void
    {
        $directory = storage_path('framework/testing/passport');
        $privatePath = $directory.'/oauth-private.key';
        $publicPath = $directory.'/oauth-public.key';

        if (! File::exists($privatePath) || ! File::exists($publicPath)) {
            File::ensureDirectoryExists($directory);
            $key = openssl_pkey_new([
                'private_key_bits' => 2048,
                'private_key_type' => OPENSSL_KEYTYPE_RSA,
            ]);
            if ($key === false || ! openssl_pkey_export($key, $privateKey)) {
                throw new RuntimeException('Unable to generate the test Passport private key.');
            }

            $details = openssl_pkey_get_details($key);
            if (! is_array($details)) {
                throw new RuntimeException('Unable to derive the test Passport public key.');
            }

            File::put($privatePath, $privateKey);
            File::put($publicPath, $details['key']);
        }

        File::chmod($privatePath, 0600);
        File::chmod($publicPath, 0600);
        Passport::loadKeysFrom($directory);
    }

    private static function environmentValue(string $key): ?string
    {
        $value = getenv($key);

        return is_string($value) ? $value : null;
    }
}
