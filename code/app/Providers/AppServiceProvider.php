<?php

namespace App\Providers;

use App\Account\Closure\CapsuleInventoryRepository;
use App\Account\Closure\EmptyCapsuleInventoryRepository;
use App\Account\Deletion\AccountDeletionService;
use App\Account\Deletion\AccountTrustProfileRepository;
use App\Account\Deletion\DeletionLedgerParticipant;
use App\Account\Deletion\EmptyAccountTrustProfileRepository;
use App\Account\Sanctions\SanctionTombstoneDeletionParticipant;
use App\Account\Sessions\AccountSessionRepository;
use App\Account\Sessions\DatabaseAccountSessionRepository;
use App\Models\User;
use App\OAuth\Dpop\DpopAccessToken;
use App\OAuth\Dpop\DpopAccessTokenRepository;
use App\OAuth\Dpop\DpopRefreshTokenRepository;
use App\OAuth\Dpop\DpopTokenResponse;
use Illuminate\Auth\Events\Login;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
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
        $this->app->bind(CapsuleInventoryRepository::class, EmptyCapsuleInventoryRepository::class);
        $this->app->bind(AccountTrustProfileRepository::class, EmptyAccountTrustProfileRepository::class);
        $this->app->tag(
            [SanctionTombstoneDeletionParticipant::class, DeletionLedgerParticipant::class],
            'account-deletion-participants',
        );
        $this->app->when(AccountDeletionService::class)
            ->needs('$participants')
            ->giveTagged('account-deletion-participants');
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

        Event::listen(Login::class, function (Login $event): void {
            if (! $event->user instanceof User || ! $event->user->isClosed()) {
                return;
            }

            Auth::guard($event->guard)->logout();

            throw ValidationException::withMessages([
                'email' => trans('auth.failed'),
            ]);
        });

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

        RateLimiter::for('account-closure', fn (Request $request): Limit => Limit::perHour(3)
            ->by(($request->user()?->getAuthIdentifier() ?? 'guest').'|'.$request->ip()));

        RateLimiter::for('account-recovery', fn (Request $request): Limit => Limit::perMinute(5)
            ->by(mb_strtolower($request->string('email')->trim()->toString()).'|'.$request->ip()));

        RateLimiter::for('account-recovery-complete', function (Request $request): Limit {
            $user = $request->route('user');
            $identifier = $user instanceof User
                ? $user->getAuthIdentifier()
                : (string) $user;

            return Limit::perMinute(10)->by($identifier.'|'.$request->ip());
        });
    }
}
