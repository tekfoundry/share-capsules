<?php

namespace App\Http\Controllers\Auth;

use App\Account\Closure\AccountCapsuleInventory;
use App\Account\Closure\AccountClosureService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Account\RequestAccountRecoveryLink;
use App\Models\User;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Response;

final class AccountRecoveryController extends Controller
{
    public function __construct(
        private AccountClosureService $closure,
        private AccountCapsuleInventory $inventory,
    ) {}

    public function notice(): View
    {
        return view('auth.account-recovery-request');
    }

    public function sendLink(RequestAccountRecoveryLink $request): RedirectResponse
    {
        $this->closure->sendRecoveryLink($request->string('email')->toString());

        return back()->with(
            'status',
            'If that address belongs to a recoverable account, a new recovery link has been sent.',
        );
    }

    public function show(User $user, string $token): View
    {
        abort_unless($this->closure->canRecover($user, $token), 404);
        $expiresAt = now()->addMinutes(
            (int) config('accounts.closure.completion_link_minutes'),
        );

        return view('auth.account-recovery', [
            'deletionDueAt' => $user->deletion_due_at,
            'restoreUrl' => URL::temporarySignedRoute(
                'account.restore.complete',
                $expiresAt,
                ['user' => $user->getKey(), 'token' => $token],
            ),
            'inventoryUrl' => URL::temporarySignedRoute(
                'account.restore.inventory',
                $expiresAt,
                ['user' => $user->getKey(), 'token' => $token],
            ),
        ]);
    }

    public function inventory(User $user, string $token): Response
    {
        abort_unless($this->closure->canRecover($user, $token), 404);

        return response()->json(
            $this->inventory->document($user),
            headers: [
                'Cache-Control' => 'no-store',
                'Content-Disposition' => 'attachment; filename="share-capsules-inventory.json"',
            ],
            options: JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES,
        );
    }

    public function complete(User $user, string $token): RedirectResponse
    {
        abort_unless($this->closure->restore($user, $token), 404);

        return redirect()->route('login')->with(
            'status',
            'Your account was restored. Sign in again to continue.',
        );
    }
}
