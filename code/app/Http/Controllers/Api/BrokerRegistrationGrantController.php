<?php

namespace App\Http\Controllers\Api;

use App\Broker\Registration\RegistrationGrantService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Broker\CreateRegistrationGrantRequest;
use App\Models\User;
use App\Models\ViewerDevice;
use Illuminate\Http\JsonResponse;

final class BrokerRegistrationGrantController extends Controller
{
    public function __invoke(
        CreateRegistrationGrantRequest $request,
        RegistrationGrantService $grants,
    ): JsonResponse {
        $user = $request->user();
        $deviceId = $user?->token()?->getAttribute('viewer_device_id');
        $device = is_string($deviceId) ? ViewerDevice::query()->find($deviceId) : null;

        abort_unless($user instanceof User && $device instanceof ViewerDevice, 403);
        $this->rejectUnknownFields($request);

        $grant = $grants->issue(
            $user,
            $device,
            $request->string('registration_id')->toString(),
            $request->string('capsule_id')->toString(),
            $request->integer('capsule_revision'),
            $request->string('payload_id')->toString(),
            $request->string('policy_sha256')->toString(),
            $request->string('content_key_sha256')->toString(),
        );

        return response()->json([
            'type' => 'broker-registration-grant',
            'version' => 1,
            'grant' => $grant->token,
            'expires_in' => 60,
            'broker' => (string) config('sharecapsules.broker.base_url'),
        ], 201, ['Cache-Control' => 'no-store']);
    }

    private function rejectUnknownFields(CreateRegistrationGrantRequest $request): void
    {
        $keys = array_keys($request->all());
        sort($keys);
        $expected = [
            'capsule_id',
            'capsule_revision',
            'content_key_sha256',
            'payload_id',
            'policy_sha256',
            'registration_id',
        ];

        abort_unless($keys === $expected, 422);
    }
}
