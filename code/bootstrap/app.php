<?php

use App\Ctx\Discovery\CtxDiscoveryPath;
use App\Http\Controllers\Ctx\AuthorizeCtxController;
use App\Http\Controllers\Ctx\ProviderMetadataController;
use App\Http\Controllers\Ctx\TicketSigningJwksController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\Internal\RedeemBrokerRegistrationGrantController;
use App\Http\Controllers\Internal\RedeemCtxTicketController;
use App\Http\Middleware\AssignCorrelationId;
use App\Http\Middleware\AuthenticateBrokerCallback;
use App\Http\Middleware\EnsureAccountIsActive;
use App\Http\Middleware\RejectDeviceBoundBearerToken;
use App\Http\Middleware\RequireDeletionLedgerReplay;
use App\Http\Middleware\ValidateDpopAccessToken;
use App\Http\Middleware\ValidateTokenEndpointDpop;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Laravel\Passport\Http\Controllers\AccessTokenController;
use Laravel\Passport\Http\Middleware\CheckToken;

$component = getenv('SHARECAPSULES_COMPONENT') ?: 'control-plane';
if ($component === 'broker') {
    return require __DIR__.'/broker.php';
}

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        then: function (): void {
            Route::get(
                CtxDiscoveryPath::forIssuer((string) config('sharecapsules.ctx.issuer')),
                ProviderMetadataController::class,
            )->name('ctx.discovery');
            Route::get('/ctx/jwks.json', TicketSigningJwksController::class)
                ->name('ctx.jwks');
            Route::post('/ctx/authorize', AuthorizeCtxController::class)
                ->middleware([
                    ValidateDpopAccessToken::class,
                    'auth:api',
                    CheckToken::class.':ctx:authorize',
                    'throttle:ctx-authorize',
                ])
                ->name('ctx.authorize');
            Route::get('/up', HealthController::class)->name('health');
            Route::post('/oauth/token', [AccessTokenController::class, 'issueToken'])
                ->middleware([ValidateTokenEndpointDpop::class, 'throttle:oauth-token'])
                ->name('passport.token');
            Route::post(
                '/internal/broker/registration-grants/redeem',
                RedeemBrokerRegistrationGrantController::class,
            )->middleware(['broker.callback', 'throttle:broker-callback'])
                ->name('internal.broker.registration-grants.redeem');
            Route::post('/ctx/tickets/redeem', RedeemCtxTicketController::class)
                ->middleware(['broker.callback', 'throttle:broker-callback'])
                ->name('ctx.tickets.redeem');
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'account.active' => EnsureAccountIsActive::class,
            'broker.callback' => AuthenticateBrokerCallback::class,
        ]);
        $middleware->prependToPriorityList(
            AuthenticatesRequests::class,
            ValidateDpopAccessToken::class,
        );
        $middleware->append(AssignCorrelationId::class);
        $middleware->append(RequireDeletionLedgerReplay::class);
        $middleware->append(RejectDeviceBoundBearerToken::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
