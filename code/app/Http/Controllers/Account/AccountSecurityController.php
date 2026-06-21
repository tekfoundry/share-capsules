<?php

namespace App\Http\Controllers\Account;

use App\Account\Sessions\AccountSessionService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Account\RevokeOtherSessionsRequest;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class AccountSecurityController extends Controller
{
    public function __construct(private readonly AccountSessionService $sessions) {}

    public function show(Request $request): View
    {
        return view('account.security', [
            'sessions' => $this->sessions->forUser($request->user(), $request->session()->getId()),
        ]);
    }

    public function destroy(Request $request, string $sessionId): RedirectResponse
    {
        $revoked = $this->sessions->revoke(
            $request->user(),
            $sessionId,
            $request->session()->getId(),
        );

        return $revoked
            ? back()->with('status', 'Session revoked.')
            : back()->withErrors(['session' => 'That session could not be revoked.']);
    }

    public function destroyOthers(RevokeOtherSessionsRequest $request): RedirectResponse
    {
        $revoked = $this->sessions->revokeOthers(
            $request->user(),
            $request->session()->getId(),
        );

        return back()->with('status', trans_choice(
            '{0} No other sessions were active.|{1} One other session was revoked.|[2,*] :count other sessions were revoked.',
            $revoked,
            ['count' => $revoked],
        ));
    }
}
