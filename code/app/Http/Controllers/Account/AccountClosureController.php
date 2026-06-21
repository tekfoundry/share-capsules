<?php

namespace App\Http\Controllers\Account;

use App\Account\Closure\AccountCapsuleInventory;
use App\Account\Closure\AccountClosureService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Account\CloseAccountRequest;
use App\Models\User;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

final class AccountClosureController extends Controller
{
    public function __construct(
        private AccountClosureService $closure,
        private AccountCapsuleInventory $inventory,
    ) {}

    public function show(Request $request): View
    {
        /** @var User $user */
        $user = $request->user();

        return view('account.closure', [
            'capsuleCount' => $this->inventory->document($user)['capsule_count'],
            'recoveryDays' => (int) config('accounts.closure.recovery_days'),
        ]);
    }

    public function inventory(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        return $this->inventoryResponse($user);
    }

    public function store(CloseAccountRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->closure->close($user);
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('account.restore.notice')->with(
            'status',
            'Your account is closed. Check your email for the recovery link.',
        );
    }

    private function inventoryResponse(User $user): Response
    {
        return response()->json(
            $this->inventory->document($user),
            headers: [
                'Cache-Control' => 'no-store',
                'Content-Disposition' => 'attachment; filename="share-capsules-inventory.json"',
            ],
            options: JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES,
        );
    }
}
