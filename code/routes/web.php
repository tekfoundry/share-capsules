<?php

use App\Http\Controllers\Account\AccountClosureController;
use App\Http\Controllers\Account\AccountPasskeyController;
use App\Http\Controllers\Account\AccountPrivacyController;
use App\Http\Controllers\Account\AccountSecurityController;
use App\Http\Controllers\Account\AccountViewerDeviceController;
use App\Http\Controllers\Auth\AccountRecoveryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Studio\CapsuleInventoryController;
use App\Http\Controllers\ViewerInstallController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Http\Controllers\PasswordResetLinkController;
use Laravel\Fortify\Http\Controllers\RegisteredUserController;
use Laravel\Passport\Http\Controllers\ApproveAuthorizationController;
use Laravel\Passport\Http\Controllers\AuthorizationController;
use Laravel\Passport\Http\Controllers\DenyAuthorizationController;

Route::get('/', function () {
    return view('welcome');
})->name('home');

Route::view('/how-it-works', 'public.how-it-works')->name('how-it-works');
Route::view('/instructions', 'public.instructions')->name('instructions');
Route::view('/technical', 'public.technical')->name('technical');
Route::get('/viewer/install', ViewerInstallController::class)->name('viewer.install');

Route::view('/terms', 'legal.terms')->name('terms');
Route::view('/privacy', 'legal.privacy')->name('privacy');

Route::prefix('account/restore')->name('account.restore.')->group(function (): void {
    Route::get('/', [AccountRecoveryController::class, 'notice'])->name('notice');
    Route::post('/', [AccountRecoveryController::class, 'sendLink'])
        ->middleware('throttle:account-recovery')
        ->name('send');
    Route::get('/{user}/{token}', [AccountRecoveryController::class, 'show'])
        ->middleware(['signed', 'throttle:account-recovery-complete'])
        ->where('token', '[A-Za-z0-9]{64}')
        ->name('show');
    Route::get('/{user}/{token}/inventory', [AccountRecoveryController::class, 'inventory'])
        ->middleware(['signed', 'throttle:account-recovery-complete'])
        ->where('token', '[A-Za-z0-9]{64}')
        ->name('inventory');
    Route::post('/{user}/{token}', [AccountRecoveryController::class, 'complete'])
        ->middleware(['signed', 'throttle:account-recovery-complete'])
        ->where('token', '[A-Za-z0-9]{64}')
        ->name('complete');
});

Route::middleware('guest')->group(function (): void {
    Route::post('/register', [RegisteredUserController::class, 'store'])
        ->middleware('throttle:registration')
        ->name('register.store');
    Route::post('/forgot-password', [PasswordResetLinkController::class, 'store'])
        ->middleware('throttle:password-reset')
        ->name('password.email');
});

Route::middleware(['auth', 'account.active'])->group(function (): void {
    Route::get('/dashboard', DashboardController::class)
        ->middleware('verified')
        ->name('dashboard');

    Route::view('/studio/capsules/create', 'studio.capsules.create')
        ->middleware('verified')
        ->name('studio.capsules.create');
    Route::get('/studio/capsules', [CapsuleInventoryController::class, 'index'])
        ->middleware('verified')->name('studio.capsules.index');
    Route::get('/studio/capsules/{capsuleId}/revisions/{revision}/metrics', [CapsuleInventoryController::class, 'metrics'])
        ->middleware('verified')->whereNumber('revision')->name('studio.capsules.metrics');
    Route::patch('/studio/capsules/{capsuleId}/revisions/{revision}/label', [CapsuleInventoryController::class, 'updateLabel'])
        ->middleware('verified')->whereNumber('revision')->name('studio.capsules.label');
    Route::post('/studio/capsules/revoke', [CapsuleInventoryController::class, 'revoke'])
        ->middleware(['verified', 'password.confirm'])->name('studio.capsules.revoke');
    Route::delete('/studio/capsules/{capsuleId}/revisions/{revision}', [CapsuleInventoryController::class, 'destroy'])
        ->middleware(['verified', 'password.confirm', 'throttle:6,1'])
        ->whereNumber('revision')->name('studio.capsules.destroy');

    Route::middleware('verified')->prefix('account')->name('account.')->group(function (): void {
        Route::get('/security', [AccountSecurityController::class, 'show'])
            ->name('security');
        Route::get('/closure', [AccountClosureController::class, 'show'])
            ->middleware('password.confirm')
            ->name('closure.show');
        Route::get('/closure/inventory', [AccountClosureController::class, 'inventory'])
            ->middleware('password.confirm')
            ->name('closure.inventory');
        Route::post('/closure', [AccountClosureController::class, 'store'])
            ->middleware(['password.confirm', 'throttle:account-closure'])
            ->name('closure.store');
        Route::get('/privacy/export', [AccountPrivacyController::class, 'export'])
            ->middleware('password.confirm')
            ->name('privacy.export');
        Route::post('/privacy/correction', [AccountPrivacyController::class, 'correction'])
            ->middleware('throttle:6,1')
            ->name('privacy.correction');
        Route::post('/privacy/appeal', [AccountPrivacyController::class, 'appeal'])
            ->middleware('throttle:6,1')
            ->name('privacy.appeal');
        Route::delete('/privacy/challenge-evidence', [AccountPrivacyController::class, 'destroyChallengeEvidence'])
            ->middleware(['password.confirm', 'throttle:6,1'])
            ->name('privacy.challenge-evidence.destroy');
        Route::get('/passkeys', [AccountPasskeyController::class, 'show'])
            ->middleware('password.confirm')
            ->name('passkeys');
        Route::get('/devices', [AccountViewerDeviceController::class, 'index'])
            ->name('devices.index');
        Route::patch('/devices/{device}', [AccountViewerDeviceController::class, 'update'])
            ->name('devices.update');
        Route::middleware('password.confirm')->group(function (): void {
            Route::post('/devices/{device}/suspend', [AccountViewerDeviceController::class, 'suspend'])
                ->name('devices.suspend');
            Route::post('/devices/{device}/activate', [AccountViewerDeviceController::class, 'activate'])
                ->name('devices.activate');
            Route::delete('/devices/{device}', [AccountViewerDeviceController::class, 'destroy'])
                ->name('devices.destroy');
        });
        Route::delete('/security/sessions', [AccountSecurityController::class, 'destroyOthers'])
            ->middleware('throttle:6,1')
            ->name('sessions.destroy-others');
        Route::delete('/security/sessions/{sessionId}', [AccountSecurityController::class, 'destroy'])
            ->where('sessionId', '[A-Za-z0-9]+')
            ->middleware('throttle:12,1')
            ->name('sessions.destroy');
    });
});

Route::middleware(['auth', 'account.active', 'verified'])->group(function (): void {
    Route::get('/oauth/authorize', [AuthorizationController::class, 'authorize'])
        ->name('passport.authorizations.authorize');
    Route::post('/oauth/authorize', [ApproveAuthorizationController::class, 'approve'])
        ->name('passport.authorizations.approve');
    Route::delete('/oauth/authorize', [DenyAuthorizationController::class, 'deny'])
        ->name('passport.authorizations.deny');
});
