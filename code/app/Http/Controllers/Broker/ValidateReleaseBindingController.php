<?php

namespace App\Http\Controllers\Broker;

use App\Broker\Lifecycle\BrokerContentKeyStatus;
use App\Http\Controllers\Controller;
use App\Models\BrokerContentKey;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ValidateReleaseBindingController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'capsule_id' => ['required', 'string'],
            'capsule_revision' => ['required', 'integer', 'min:1'],
            'policy_sha256' => ['required', 'string', 'size:43'],
            'payload_id' => ['required', 'string'],
            'release_handle' => ['required', 'string', 'min:16', 'max:128'],
        ]);
        $keys = array_keys($request->all());
        sort($keys);
        abort_unless($keys === [
            'capsule_id',
            'capsule_revision',
            'payload_id',
            'policy_sha256',
            'release_handle',
        ], 422);

        $valid = BrokerContentKey::query()
            ->where('release_handle', $validated['release_handle'])
            ->where('capsule_id', $validated['capsule_id'])
            ->where('capsule_revision', $validated['capsule_revision'])
            ->where('policy_sha256', $validated['policy_sha256'])
            ->where('payload_id', $validated['payload_id'])
            ->where('status', BrokerContentKeyStatus::Active->value)
            ->exists();

        return response()->json(['valid' => $valid], headers: ['Cache-Control' => 'no-store']);
    }
}
