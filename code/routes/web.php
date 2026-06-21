<?php

use App\Http\Controllers\Account\AccountPasskeyController;
use App\Http\Controllers\Account\AccountSecurityController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Http\Controllers\PasswordResetLinkController;
use Laravel\Fortify\Http\Controllers\RegisteredUserController;

Route::get('/', function () {
    return view('welcome');
})->name('home');

Route::view('/terms', 'legal.terms')->name('terms');
Route::view('/privacy', 'legal.privacy')->name('privacy');

Route::middleware('guest')->group(function (): void {
    Route::post('/register', [RegisteredUserController::class, 'store'])
        ->middleware('throttle:registration')
        ->name('register.store');
    Route::post('/forgot-password', [PasswordResetLinkController::class, 'store'])
        ->middleware('throttle:password-reset')
        ->name('password.email');
});

Route::middleware('auth')->group(function (): void {
    Route::view('/dashboard', 'dashboard')
        ->middleware('verified')
        ->name('dashboard');

    Route::middleware('verified')->prefix('account')->name('account.')->group(function (): void {
        Route::get('/security', [AccountSecurityController::class, 'show'])
            ->name('security');
        Route::get('/passkeys', [AccountPasskeyController::class, 'show'])
            ->middleware('password.confirm')
            ->name('passkeys');
        Route::delete('/security/sessions', [AccountSecurityController::class, 'destroyOthers'])
            ->middleware('throttle:6,1')
            ->name('sessions.destroy-others');
        Route::delete('/security/sessions/{sessionId}', [AccountSecurityController::class, 'destroy'])
            ->where('sessionId', '[A-Za-z0-9]+')
            ->middleware('throttle:12,1')
            ->name('sessions.destroy');
    });
});
