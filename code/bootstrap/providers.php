<?php

use App\Providers\AppServiceProvider;
use App\Providers\BrokerServiceProvider;
use App\Providers\FortifyServiceProvider;

$component = getenv('SHARECAPSULES_COMPONENT') ?: 'control-plane';

if ($component === 'broker') {
    return [BrokerServiceProvider::class];
}

return [
    AppServiceProvider::class,
    BrokerServiceProvider::class,
    FortifyServiceProvider::class,
];
