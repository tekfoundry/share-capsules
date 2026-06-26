<?php

namespace App\Providers;

use App\Broker\Audit\BrokerAuditLogger;
use App\Broker\Audit\BrokerAuditSink;
use App\Broker\Hpke\HpkeIkmSource;
use App\Broker\Hpke\NativeHpkeIkmSource;
use App\Broker\Keys\KeyProtectionFailed;
use App\Broker\Keys\KeyProtectionService;
use App\Broker\Keys\LocalKeyProtectionService;
use App\Broker\Keys\NativeNonceSource;
use App\Broker\Keys\NonceSource;
use App\Broker\Registration\ControlPlaneRegistrationGrantAuthorizer;
use App\Broker\Registration\NativeOpaqueIdentifierSource;
use App\Broker\Registration\OpaqueIdentifierSource;
use App\Broker\Registration\RegistrationGrantAuthorizer;
use App\Broker\Release\ControlPlaneTicketRedemptionClient;
use App\Broker\Release\ProviderJwksTicketPublicKeyResolver;
use App\Broker\Release\TicketPublicKeyResolver;
use App\Broker\Release\TicketRedemptionClient;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Fortify\Fortify;
use Laravel\Passkeys\Passkeys;
use Laravel\Passport\Passport;

final class BrokerServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        Passport::ignoreRoutes();

        if (config('sharecapsules.component') === 'broker') {
            Fortify::ignoreRoutes();
            Passkeys::ignoreRoutes();
            config()->set('filesystems.disks.local.serve', false);
        }

        $this->app->bind(BrokerAuditSink::class, BrokerAuditLogger::class);
        $this->app->bind(NonceSource::class, NativeNonceSource::class);
        $this->app->bind(HpkeIkmSource::class, NativeHpkeIkmSource::class);
        $this->app->bind(OpaqueIdentifierSource::class, NativeOpaqueIdentifierSource::class);
        $this->app->bind(
            RegistrationGrantAuthorizer::class,
            ControlPlaneRegistrationGrantAuthorizer::class,
        );
        $this->app->bind(
            TicketPublicKeyResolver::class,
            ProviderJwksTicketPublicKeyResolver::class,
        );
        $this->app->bind(TicketRedemptionClient::class, ControlPlaneTicketRedemptionClient::class);
        $this->app->singleton(KeyProtectionService::class, function (): KeyProtectionService {
            if (config('sharecapsules.broker.kms.driver') !== 'local') {
                throw new KeyProtectionFailed('The configured broker key-custody driver is unavailable.');
            }

            $configured = (string) config('sharecapsules.broker.kms.local_master_key');
            $encoded = str_starts_with($configured, 'base64:') ? substr($configured, 7) : '';
            $masterKey = base64_decode($encoded, true);
            if (! is_string($masterKey)) {
                throw new KeyProtectionFailed('The local key-protection key is invalid.');
            }

            return new LocalKeyProtectionService(
                masterKey: $masterKey,
                keyId: (string) config('sharecapsules.broker.kms.key_id'),
                nonceSource: app(NonceSource::class),
            );
        });
    }

    public function boot(): void
    {
        RateLimiter::for('broker-registrations', fn (Request $request): Limit => Limit::perMinute(30)
            ->by($request->ip()));
        RateLimiter::for('broker-releases', fn (Request $request): Limit => Limit::perMinute(60)
            ->by($request->ip()));
    }
}
