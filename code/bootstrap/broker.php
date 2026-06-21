<?php

use App\Http\Middleware\AssignCorrelationId;
use App\Http\Middleware\AuthenticateBrokerControlPlane;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        commands: __DIR__.'/../routes/console.php',
        then: function (): void {
            require base_path('routes/broker.php');
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'broker.control-plane' => AuthenticateBrokerControlPlane::class,
        ]);
        $middleware->append(AssignCorrelationId::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (): bool => true);
    })->create();
