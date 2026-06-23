<?php

namespace App\Http\Controllers\Api;

use App\Capsules\Registry\CapsuleRegistrationLifecycle;
use App\Capsules\Registry\CapsuleRegistryConflict;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CapsuleRegistrationController extends Controller
{
    public function finalize(
        Request $request,
        string $registrationId,
        CapsuleRegistrationLifecycle $lifecycle,
    ): JsonResponse {
        $request->validate(['release_handle' => ['required', 'string', 'size:43', 'regex:/\A[A-Za-z0-9_-]+\z/']]);
        abort_unless(array_keys($request->all()) === ['release_handle'], 422);
        /** @var User $user */
        $user = $request->user();
        try {
            $capsule = $lifecycle->finalize($user, $registrationId, $request->string('release_handle')->toString());
        } catch (CapsuleRegistryConflict) {
            abort(409);
        }

        return response()->json([
            'type' => 'capsule-registration', 'version' => 1,
            'registration_id' => $capsule->registration_id, 'status' => 'active',
        ], headers: ['Cache-Control' => 'no-store']);
    }

    public function cancel(
        Request $request,
        string $registrationId,
        CapsuleRegistrationLifecycle $lifecycle,
    ): JsonResponse {
        abort_unless($request->all() === [], 422);
        /** @var User $user */
        $user = $request->user();
        try {
            $capsule = $lifecycle->cancel($user, $registrationId);
        } catch (CapsuleRegistryConflict) {
            abort(409);
        }

        return response()->json([
            'type' => 'capsule-registration', 'version' => 1,
            'registration_id' => $capsule->registration_id, 'status' => 'destroyed',
        ], headers: ['Cache-Control' => 'no-store']);
    }
}
