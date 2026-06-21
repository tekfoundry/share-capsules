<?php

namespace Tests\Feature\Auth;

use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as RouteFacade;
use Laravel\Fortify\Http\Controllers\AuthenticatedSessionController;
use Laravel\Fortify\Http\Controllers\EmailVerificationNotificationController;
use Laravel\Fortify\Http\Controllers\NewPasswordController;
use Laravel\Fortify\Http\Controllers\PasswordResetLinkController;
use Laravel\Fortify\Http\Controllers\RegisteredUserController;
use Laravel\Fortify\Http\Controllers\VerifyEmailController;
use Tests\TestCase;

final class FortifyRoutesTest extends TestCase
{
    /**
     * @param  array{0: class-string, 1: string}  $expectedAction
     */
    private function assertRouteUses(string $name, array $expectedAction): void
    {
        $route = RouteFacade::getRoutes()->getByName($name);

        $this->assertInstanceOf(Route::class, $route);
        $this->assertSame($expectedAction[0].'@'.$expectedAction[1], $route->getActionName());
    }

    public function test_all_account_authentication_routes_use_fortify_handlers(): void
    {
        $this->assertRouteUses('login.store', [AuthenticatedSessionController::class, 'store']);
        $this->assertRouteUses('logout', [AuthenticatedSessionController::class, 'destroy']);
        $this->assertRouteUses('register.store', [RegisteredUserController::class, 'store']);
        $this->assertRouteUses('password.email', [PasswordResetLinkController::class, 'store']);
        $this->assertRouteUses('password.update', [NewPasswordController::class, 'store']);
        $this->assertRouteUses('verification.send', [EmailVerificationNotificationController::class, 'store']);
        $this->assertRouteUses('verification.verify', [VerifyEmailController::class, '__invoke']);
    }

    public function test_custom_auth_throttles_are_preserved_on_fortify_handlers(): void
    {
        $registration = RouteFacade::getRoutes()->getByName('register.store');
        $passwordReset = RouteFacade::getRoutes()->getByName('password.email');

        $this->assertContains('throttle:registration', $registration?->gatherMiddleware());
        $this->assertContains('throttle:password-reset', $passwordReset?->gatherMiddleware());
    }
}
