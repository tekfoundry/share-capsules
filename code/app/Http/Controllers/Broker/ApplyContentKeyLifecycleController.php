<?php

namespace App\Http\Controllers\Broker;

use App\Broker\Lifecycle\BrokerContentKeyLifecycleManager;
use App\Broker\Lifecycle\BrokerContentKeyOperation;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class ApplyContentKeyLifecycleController extends Controller
{
    public function __invoke(
        Request $request,
        BrokerContentKeyLifecycleManager $lifecycle,
    ): JsonResponse {
        $validated = $request->validate([
            'operation' => ['required', Rule::enum(BrokerContentKeyOperation::class)],
            'creator_id' => ['required', 'string', 'regex:/\A[1-9][0-9]*\z/'],
            'capsule_id' => ['sometimes', 'string', 'max:45'],
            'capsule_revision' => ['sometimes', 'integer', 'min:1'],
            'registration_id' => ['sometimes', 'string', 'min:16', 'max:128'],
            'release_handle' => ['sometimes', 'string', 'min:16', 'max:128'],
        ]);
        $operation = BrokerContentKeyOperation::from($validated['operation']);
        $expected = match ($operation) {
            BrokerContentKeyOperation::RevokeCapsule,
            BrokerContentKeyOperation::DestroyCapsule => ['capsule_id', 'capsule_revision', 'creator_id', 'operation'],
            BrokerContentKeyOperation::FinalizeRegistration => ['creator_id', 'operation', 'registration_id', 'release_handle'],
            BrokerContentKeyOperation::CancelRegistration => ['creator_id', 'operation', 'registration_id'],
            default => ['creator_id', 'operation'],
        };
        $keys = array_keys($request->all());
        sort($keys);
        abort_unless($keys === $expected, 422);

        $changed = $lifecycle->apply(
            $operation,
            $validated['creator_id'],
            $validated['capsule_id'] ?? null,
            $validated['capsule_revision'] ?? null,
            $validated['registration_id'] ?? null,
            $validated['release_handle'] ?? null,
        );

        return response()->json([
            'type' => 'broker-content-key-lifecycle-result',
            'version' => 1,
            'applied' => true,
            'changed_records' => $changed,
        ], headers: ['Cache-Control' => 'no-store']);
    }
}
