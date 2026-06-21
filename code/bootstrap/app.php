<?php

use App\Http\Controllers\HealthController;
use App\Http\Middleware\AssignCorrelationId;
use App\Http\Middleware\EnsureAccountIsActive;
use App\Http\Middleware\RejectDeviceBoundBearerToken;
use App\Http\Middleware\RequireDeletionLedgerReplay;
use App\Http\Middleware\ValidateTokenEndpointDpop;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Laravel\Passport\Http\Controllers\AccessTokenController;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        then: function (): void {
            Route::get('/up', HealthController::class)->name('health');
            Route::post('/oauth/token', [AccessTokenController::class, 'issueToken'])
                ->middleware([ValidateTokenEndpointDpop::class, 'throttle:oauth-token'])
                ->name('passport.token');
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias(['account.active' => EnsureAccountIsActive::class]);
        $middleware->append(AssignCorrelationId::class);
        $middleware->append(RequireDeletionLedgerReplay::class);
        $middleware->append(RejectDeviceBoundBearerToken::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
