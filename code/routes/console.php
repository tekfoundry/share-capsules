<?php

use App\Ctx\SigningKeys\TicketSigningKeyLifecycle;
use App\Models\AccountDeletionLedgerEntry;
use App\Models\BrokerDeviceProof;
use App\Models\BrokerRegistrationGrant;
use App\Models\CtxAuthorizationTicket;
use App\Models\CtxAutomationRiskActivity;
use App\Models\CtxAutomationRiskAssessment;
use App\Models\CtxChallengeAttempt;
use App\Models\CtxMetricEventRecord;
use App\Models\SanctionTombstone;
use App\Models\ViewerDeviceChallenge;
use Illuminate\Support\Facades\Schedule;

Schedule::command('model:prune', [
    '--model' => ViewerDeviceChallenge::class,
])->daily();

Schedule::command('model:prune', [
    '--model' => SanctionTombstone::class,
])->hourly()->onOneServer()->withoutOverlapping();

Schedule::command('model:prune', [
    '--model' => AccountDeletionLedgerEntry::class,
])->hourly()->onOneServer()->withoutOverlapping();

Schedule::command('model:prune', [
    '--model' => CtxAuthorizationTicket::class,
])->hourly()->onOneServer()->withoutOverlapping();

Schedule::command('model:prune', [
    '--model' => BrokerRegistrationGrant::class,
])->hourly()->onOneServer()->withoutOverlapping();

Schedule::command('model:prune', [
    '--model' => BrokerDeviceProof::class,
])->hourly()->onOneServer()->withoutOverlapping();

Schedule::command('model:prune', [
    '--model' => CtxMetricEventRecord::class,
])->daily()->onOneServer()->withoutOverlapping();

Schedule::command('model:prune', [
    '--model' => CtxAutomationRiskActivity::class,
])->daily()->onOneServer()->withoutOverlapping();

Schedule::command('model:prune', [
    '--model' => CtxAutomationRiskAssessment::class,
])->daily()->onOneServer()->withoutOverlapping();

Schedule::command('model:prune', [
    '--model' => CtxChallengeAttempt::class,
])->daily()->onOneServer()->withoutOverlapping();

Schedule::command('accounts:delete-expired')
    ->hourly()
    ->onOneServer()
    ->withoutOverlapping();

Schedule::command('capsules:clean-pending')
    ->everyFiveMinutes()
    ->onOneServer()
    ->withoutOverlapping();

Schedule::call(fn () => app(TicketSigningKeyLifecycle::class)->retireExpired())
    ->everyMinute()
    ->name('ctx-ticket-signing-key-retirement')
    ->onOneServer()
    ->withoutOverlapping();
