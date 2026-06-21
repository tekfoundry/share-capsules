<?php

use App\Http\Controllers\Api\BrokerRegistrationGrantController;
use App\Http\Controllers\Api\ViewerDeviceRegistrationController;
use App\Http\Middleware\ValidateDpopAccessToken;
use Illuminate\Support\Facades\Route;
use Laravel\Passport\Http\Middleware\CheckToken;

Route::middleware(['auth:api', 'account.active', 'verified', CheckToken::class.':extension:connect'])
    ->prefix('viewer-devices')
    ->name('api.viewer-devices.')
    ->group(function (): void {
        Route::post('/challenges', [ViewerDeviceRegistrationController::class, 'challenge'])
            ->middleware('throttle:device-registration')
            ->name('challenges.store');
        Route::post('/', [ViewerDeviceRegistrationController::class, 'store'])
            ->middleware('throttle:device-registration')
            ->name('store');
    });

Route::post('/broker-registration-grants', BrokerRegistrationGrantController::class)
    ->middleware([
        ValidateDpopAccessToken::class,
        'auth:api',
        'account.active',
        'verified',
        CheckToken::class.':capsule:create',
        'throttle:broker-registration-grants',
    ])
    ->name('api.broker-registration-grants.store');
