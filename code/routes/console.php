<?php

use App\Models\ViewerDeviceChallenge;
use Illuminate\Support\Facades\Schedule;

Schedule::command('model:prune', [
    '--model' => ViewerDeviceChallenge::class,
])->daily();

Schedule::command('accounts:delete-expired')
    ->hourly()
    ->onOneServer()
    ->withoutOverlapping();
