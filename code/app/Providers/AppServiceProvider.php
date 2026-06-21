<?php

namespace App\Providers;

use App\Account\Sessions\AccountSessionRepository;
use App\Account\Sessions\DatabaseAccountSessionRepository;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
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
    }
}
