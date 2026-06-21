<?php

namespace App\Providers;

use App\Account\Sessions\AccountSessionRepository;
use App\Account\Sessions\DatabaseAccountSessionRepository;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Laravel\Passport\Passport;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        Passport::ignoreRoutes();
        $this->app->bind(AccountSessionRepository::class, DatabaseAccountSessionRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Password::defaults(
            fn (): Password => Password::min(12)->mixedCase()->numbers()->symbols(),
        );

        Passport::authorizationView('auth.oauth.authorize');
        Passport::tokensCan(config('sharecapsules.oauth.extension_scopes'));
        Passport::tokensExpireIn(
            now()->addMinutes((int) config('sharecapsules.oauth.access_token_ttl_minutes')),
        );

        RateLimiter::for('oauth-token', fn (Request $request): Limit => Limit::perMinute(30)
            ->by($request->ip()));

        RateLimiter::for('device-registration', fn (Request $request): Limit => Limit::perMinute(10)
            ->by(($request->user()?->getAuthIdentifier() ?? 'guest').'|'.$request->ip()));
    }
}
