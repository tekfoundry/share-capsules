<?php

namespace App\Http\Controllers\Broker;

use App\Broker\Keys\ContentKey;
use App\Broker\Registration\ContentKeyRegistrar;
use App\Broker\Registration\RegistrationAuthorizationFailed;
use App\Http\Controllers\Controller;
use App\Http\Requests\Broker\RegisterContentKeyRequest;
use Illuminate\Http\JsonResponse;
use Throwable;

final class RegisterContentKeyController extends Controller
{
    public function __invoke(
        RegisterContentKeyRequest $request,
        ContentKeyRegistrar $registrar,
    ): JsonResponse {
        $this->rejectUnknownFields($request);

        try {
            $encodedKey = $request->string('content_key')->toString();
            $keyBytes = sodium_base642bin($encodedKey, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
            if (sodium_bin2base64($keyBytes, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING) !== $encodedKey) {
                abort(422);
            }
            $registered = $registrar->register(
                $request->string('grant')->toString(),
                $request->string('registration_id')->toString(),
                $request->string('capsule_id')->toString(),
                $request->string('payload_id')->toString(),
                ContentKey::fromBytes($keyBytes),
            );
        } catch (RegistrationAuthorizationFailed) {
            return response()->json(['error' => 'registration_not_authorized'], 401, [
                'Cache-Control' => 'no-store',
            ]);
        } catch (Throwable) {
            return response()->json(['error' => 'invalid_registration'], 422, [
                'Cache-Control' => 'no-store',
            ]);
        }

        return response()->json([
            'type' => 'broker-key-registration',
            'version' => 1,
            'release_handle' => $registered->releaseHandle,
        ], $registered->created ? 201 : 200, ['Cache-Control' => 'no-store']);
    }

    private function rejectUnknownFields(RegisterContentKeyRequest $request): void
    {
        $keys = array_keys($request->all());
        sort($keys);
        $expected = [
            'capsule_id',
            'content_key',
            'grant',
            'payload_id',
            'registration_id',
            'type',
            'version',
        ];

        abort_unless($keys === $expected, 422);
    }
}
