<?php

namespace App\Http\Controllers\Internal;

use App\Broker\Registration\InvalidRegistrationGrant;
use App\Broker\Registration\RegistrationGrantService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Broker\RedeemRegistrationGrantRequest;
use Illuminate\Http\JsonResponse;

final class RedeemBrokerRegistrationGrantController extends Controller
{
    public function __invoke(
        RedeemRegistrationGrantRequest $request,
        RegistrationGrantService $grants,
    ): JsonResponse {
        $this->rejectUnknownFields($request);

        try {
            $principal = $grants->redeem(
                $request->string('grant')->toString(),
                $request->string('registration_id')->toString(),
                $request->string('capsule_id')->toString(),
                $request->string('payload_id')->toString(),
                $request->string('content_key_sha256')->toString(),
            );
        } catch (InvalidRegistrationGrant) {
            return response()->json(['error' => 'invalid_registration_grant'], 401, [
                'Cache-Control' => 'no-store',
            ]);
        }

        return response()->json([
            'type' => 'broker-registration-principal',
            'version' => 1,
            'creator_id' => $principal->creatorId,
            'capsule_revision' => $principal->capsuleRevision,
            'policy_sha256' => $principal->policySha256,
        ], 200, ['Cache-Control' => 'no-store']);
    }

    private function rejectUnknownFields(RedeemRegistrationGrantRequest $request): void
    {
        $keys = array_keys($request->all());
        sort($keys);
        $expected = ['capsule_id', 'content_key_sha256', 'grant', 'payload_id', 'registration_id'];

        abort_unless($keys === $expected, 422);
    }
}
