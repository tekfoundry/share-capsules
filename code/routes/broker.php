<?php

use App\Ctx\Discovery\CtxDiscoveryPath;
use App\Http\Controllers\Broker\ApplyContentKeyLifecycleController;
use App\Http\Controllers\Broker\BrokerHealthController;
use App\Http\Controllers\Broker\BrokerInternalStatusController;
use App\Http\Controllers\Broker\BrokerMetadataController;
use App\Http\Controllers\Broker\RegisterContentKeyController;
use App\Http\Controllers\Broker\ReleaseContentKeyController;
use App\Http\Controllers\Broker\ValidateReleaseBindingController;
use Illuminate\Support\Facades\Route;

Route::get(
    CtxDiscoveryPath::forIssuer((string) config('sharecapsules.broker.base_url')),
    BrokerMetadataController::class,
)->name('broker.discovery');

Route::get('/up', BrokerHealthController::class)->name('broker.health');
Route::post('/releases', ReleaseContentKeyController::class)
    ->middleware('throttle:broker-releases')
    ->name('broker.releases');
Route::post('/registrations', RegisterContentKeyController::class)
    ->middleware('throttle:broker-registrations')
    ->name('broker.registrations');

Route::middleware('broker.control-plane')->prefix('internal')->name('broker.internal.')->group(
    function (): void {
        Route::get('/status', BrokerInternalStatusController::class)->name('status');
        Route::post('/release-bindings/validate', ValidateReleaseBindingController::class)
            ->name('release-bindings.validate');
        Route::post('/content-keys/lifecycle', ApplyContentKeyLifecycleController::class)
            ->name('content-keys.lifecycle');
    },
);
