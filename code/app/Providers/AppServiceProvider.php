<?php

namespace App\Providers;

use App\Account\Sessions\AccountSessionRepository;
use App\Account\Sessions\DatabaseAccountSessionRepository;
use App\OAuth\Dpop\DpopAccessToken;
use App\OAuth\Dpop\DpopAccessTokenRepository;
use App\OAuth\Dpop\DpopRefreshTokenRepository;
use App\OAuth\Dpop\DpopTokenResponse;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Laravel\Passport\Bridge\AccessTokenRepository;
use Laravel\Passport\Bridge\RefreshTokenRepository;
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
        $this->app->singleton(AccessTokenRepository::class, DpopAccessTokenRepository::class);
        $this->app->singleton(RefreshTokenRepository::class, DpopRefreshTokenRepository::class);
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
        Passport::useAccessTokenEntity(DpopAccessToken::class);
        Passport::useAuthorizationServerResponseType(new DpopTokenResponse);
        Passport::tokensCan(config('sharecapsules.oauth.extension_scopes'));
        Passport::tokensExpireIn(
            now()->addMinutes((int) config('sharecapsules.oauth.access_token_ttl_minutes')),
        );
        Passport::refreshTokensExpireIn(
            now()->addDays((int) config('sharecapsules.oauth.refresh_token_ttl_days')),
        );

        RateLimiter::for('oauth-token', fn (Request $request): Limit => Limit::perMinute(30)
            ->by($request->ip()));

        RateLimiter::for('device-registration', fn (Request $request): Limit => Limit::perMinute(10)
            ->by(($request->user()?->getAuthIdentifier() ?? 'guest').'|'.$request->ip()));
    }
}
