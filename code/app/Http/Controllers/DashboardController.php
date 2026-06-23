<?php

namespace App\Http\Controllers;

use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\View\View;

final class DashboardController extends Controller
{
    public function __invoke(Request $request): View
    {
        /** @var User $user */
        $user = $request->user();
        $capsules = $user->creatorCapsules()->whereIn('status', [
            CapsuleLifecycleStatus::Active->value,
            CapsuleLifecycleStatus::RevocationPending->value,
            CapsuleLifecycleStatus::Revoked->value,
        ]);

        return view('dashboard', [
            'capsuleCount' => (clone $capsules)->count(),
            'activeCapsuleCount' => (clone $capsules)
                ->where('status', CapsuleLifecycleStatus::Active->value)
                ->count(),
        ]);
    }
}
