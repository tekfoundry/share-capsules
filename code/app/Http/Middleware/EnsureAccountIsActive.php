<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

final class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User || ! $user->isClosed()) {
            return $next($request);
        }

        if ($request->is('api/*') || $request->expectsJson()) {
            return new JsonResponse([
                'error' => 'account_unavailable',
                'error_description' => 'This account is unavailable.',
            ], 403, ['Cache-Control' => 'no-store']);
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return new RedirectResponse(route('account.restore.notice'));
    }
}
