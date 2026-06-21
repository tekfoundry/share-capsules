<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ViewerDevices\CreateViewerDeviceChallengeRequest;
use App\Http\Requests\ViewerDevices\RegisterViewerDeviceRequest;
use App\Models\User;
use App\ViewerDevices\ViewerDeviceRegistrationMessage;
use App\ViewerDevices\ViewerDeviceRegistrationService;
use Illuminate\Http\JsonResponse;

final class ViewerDeviceRegistrationController extends Controller
{
    public function challenge(
        CreateViewerDeviceChallengeRequest $request,
        ViewerDeviceRegistrationService $registration,
    ): JsonResponse {
        /** @var User $user */
        $user = $request->user();
        $proofKey = $request->proofKey();
        $agreementKey = $request->agreementKey();
        $challenge = $registration->createChallenge(
            $user,
            $request->string('device_id')->toString(),
            $proofKey,
            $agreementKey,
        );

        return response()->json([
            'type' => ViewerDeviceRegistrationMessage::TYPE,
            'version' => ViewerDeviceRegistrationMessage::VERSION,
            'challenge_id' => $challenge->id,
            'device_id' => $request->string('device_id')->toString(),
            'nonce' => $challenge->nonce,
            'proof_jkt' => $proofKey->thumbprint,
            'agreement_jkt' => $agreementKey->thumbprint,
            'server_agreement_public_key' => $challenge->serverAgreementPublicKey,
            'expires_at' => $challenge->expiresAt->format(DATE_RFC3339_EXTENDED),
        ], 201);
    }

    public function store(
        RegisterViewerDeviceRequest $request,
        ViewerDeviceRegistrationService $registration,
    ): JsonResponse {
        /** @var User $user */
        $user = $request->user();
        $device = $registration->register(
            $user,
            $request->string('challenge_id')->toString(),
            $request->string('name')->trim()->toString(),
            $request->string('proof_signature')->toString(),
            $request->string('agreement_confirmation')->toString(),
        );

        return response()->json([
            'device' => [
                'id' => $device->getKey(),
                'name' => $device->name,
                'status' => $device->status->value,
                'proof_jkt' => $device->proof_jkt,
                'agreement_jkt' => $device->agreement_jkt,
                'created_at' => $device->created_at?->format(DATE_RFC3339_EXTENDED),
            ],
        ], 201);
    }
}
