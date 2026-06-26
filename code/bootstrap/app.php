<?php

use App\Ctx\Discovery\CtxDiscoveryPath;
use App\Http\Controllers\Ctx\AuthorizeCtxController;
use App\Http\Controllers\Ctx\BalanceBeamPlaygroundController;
use App\Http\Controllers\Ctx\CargoSortPlaygroundController;
use App\Http\Controllers\Ctx\ChallengePlaygroundController;
use App\Http\Controllers\Ctx\CompleteBalanceBeamChallengeController;
use App\Http\Controllers\Ctx\CompleteCargoSortChallengeController;
use App\Http\Controllers\Ctx\CompleteCircuitTraceChallengeController;
use App\Http\Controllers\Ctx\CompleteMemoryPathChallengeController;
use App\Http\Controllers\Ctx\CompletePatternRepairChallengeController;
use App\Http\Controllers\Ctx\CompleteSignalTuneChallengeController;
use App\Http\Controllers\Ctx\CreateChallengeAttemptController;
use App\Http\Controllers\Ctx\MemoryPathPlaygroundController;
use App\Http\Controllers\Ctx\PatternRepairPlaygroundController;
use App\Http\Controllers\Ctx\ProviderMetadataController;
use App\Http\Controllers\Ctx\ShowCircuitTraceChallengeController;
use App\Http\Controllers\Ctx\SignalTunePlaygroundController;
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
use App\Http\Requests\Ctx\CreateChallengeAttemptRequest;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Exceptions\InvalidSignatureException;
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
            Route::post('/ctx/challenge-attempts', CreateChallengeAttemptController::class)
                ->middleware([
                    ValidateDpopAccessToken::class,
                    'auth:api',
                    CheckToken::class.':ctx:authorize',
                    'throttle:ctx-authorize',
                ])
                ->name('ctx.challenge-attempts.store');
            Route::get('/ctx/challenge-attempts/{attempt}', ShowCircuitTraceChallengeController::class)
                ->middleware(['signed', 'throttle:ctx-authorize'])
                ->name('ctx.challenge-attempts.show');
            Route::post('/ctx/challenge-attempts/{attempt}/modules/circuit-trace', CompleteCircuitTraceChallengeController::class)
                ->middleware(['signed', 'throttle:ctx-authorize'])
                ->name('ctx.challenge-attempts.circuit-trace.complete');
            Route::post('/ctx/challenge-attempts/{attempt}/modules/balance-beam', CompleteBalanceBeamChallengeController::class)
                ->middleware(['signed', 'throttle:ctx-authorize'])
                ->name('ctx.challenge-attempts.balance-beam.complete');
            Route::post('/ctx/challenge-attempts/{attempt}/modules/cargo-sort', CompleteCargoSortChallengeController::class)
                ->middleware(['signed', 'throttle:ctx-authorize'])
                ->name('ctx.challenge-attempts.cargo-sort.complete');
            Route::post('/ctx/challenge-attempts/{attempt}/modules/memory-path', CompleteMemoryPathChallengeController::class)
                ->middleware(['signed', 'throttle:ctx-authorize'])
                ->name('ctx.challenge-attempts.memory-path.complete');
            Route::post('/ctx/challenge-attempts/{attempt}/modules/pattern-repair', CompletePatternRepairChallengeController::class)
                ->middleware(['signed', 'throttle:ctx-authorize'])
                ->name('ctx.challenge-attempts.pattern-repair.complete');
            Route::post('/ctx/challenge-attempts/{attempt}/modules/signal-tune', CompleteSignalTuneChallengeController::class)
                ->middleware(['signed', 'throttle:ctx-authorize'])
                ->name('ctx.challenge-attempts.signal-tune.complete');
            Route::get('/ctx/challenge-playground/circuit-trace', ChallengePlaygroundController::class)
                ->middleware('throttle:ctx-authorize')
                ->name('ctx.challenge-playground.circuit-trace');
            Route::get('/ctx/challenge-playground/balance-beam', BalanceBeamPlaygroundController::class)
                ->middleware('throttle:ctx-authorize')
                ->name('ctx.challenge-playground.balance-beam');
            Route::get('/ctx/challenge-playground/signal-tune', SignalTunePlaygroundController::class)
                ->middleware('throttle:ctx-authorize')
                ->name('ctx.challenge-playground.signal-tune');
            Route::get('/ctx/challenge-playground/cargo-sort', CargoSortPlaygroundController::class)
                ->middleware('throttle:ctx-authorize')
                ->name('ctx.challenge-playground.cargo-sort');
            Route::get('/ctx/challenge-playground/memory-path', MemoryPathPlaygroundController::class)
                ->middleware('throttle:ctx-authorize')
                ->name('ctx.challenge-playground.memory-path');
            Route::get('/ctx/challenge-playground/pattern-repair', PatternRepairPlaygroundController::class)
                ->middleware('throttle:ctx-authorize')
                ->name('ctx.challenge-playground.pattern-repair');
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
        $exceptions->render(function (InvalidSignatureException $exception, Request $request) {
            if (app()->environment(['local', 'testing'])
                && $request->is('ctx/challenge-attempts/*')
                && CreateChallengeAttemptRequest::isLocalChallengePlaygroundReturnUrl((string) $request->query('return_to'))) {
                return redirect()->route('ctx.challenge-playground.circuit-trace');
            }

            return null;
        });
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
