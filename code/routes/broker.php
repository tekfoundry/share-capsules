<?php

use App\Ctx\Discovery\CtxDiscoveryPath;
use App\Http\Controllers\Broker\BrokerHealthController;
use App\Http\Controllers\Broker\BrokerMetadataController;
use Illuminate\Support\Facades\Route;

Route::get(
    CtxDiscoveryPath::forIssuer((string) config('sharecapsules.broker.base_url')),
    BrokerMetadataController::class,
)->name('broker.discovery');

Route::get('/up', BrokerHealthController::class)->name('broker.health');
require __DIR__.'/broker-api.php';
