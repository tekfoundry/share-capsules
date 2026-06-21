<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Http\Responses\ConcealedPasswordResetLinkResponse;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            FailedPasswordResetLinkRequestResponse::class,
            fn (): ConcealedPasswordResetLinkResponse => new ConcealedPasswordResetLinkResponse,
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::viewPrefix('auth.');
        Fortify::authenticateUsing(function (Request $request): ?User {
            /** @var User|null $user */
            $user = User::query()
                ->where('email', mb_strtolower($request->string('email')->trim()->toString()))
                ->first();

            return $user instanceof User
                && ! $user->isClosed()
                && Hash::check($request->string('password')->toString(), $user->password)
                    ? $user
                    : null;
        });

        RateLimiter::for('registration', fn (Request $request): Limit => Limit::perMinute(5)
            ->by($request->ip()));

        RateLimiter::for('password-reset', fn (Request $request): Limit => Limit::perMinute(6)
            ->by($request->ip()));

        RateLimiter::for('passkeys', function (Request $request): Limit {
            $credentialId = $request->input('credential.id');

            return Limit::perMinute(10)->by(
                ($credentialId ?: $request->session()->getId()).'|'.$request->ip()
            );
        });
    }
}
