<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

final class AccountPasskeyController extends Controller
{
    public function show(Request $request): View
    {
        return view('account.passkeys', [
            'passkeys' => $request->user()->passkeys()->latest()->get(),
        ]);
    }
}
