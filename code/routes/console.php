<?php

use App\Models\SanctionTombstone;
use App\Models\ViewerDeviceChallenge;
use Illuminate\Support\Facades\Schedule;

Schedule::command('model:prune', [
    '--model' => ViewerDeviceChallenge::class,
])->daily();

Schedule::command('model:prune', [
    '--model' => SanctionTombstone::class,
])->hourly()->onOneServer()->withoutOverlapping();

Schedule::command('accounts:delete-expired')
    ->hourly()
    ->onOneServer()
    ->withoutOverlapping();
