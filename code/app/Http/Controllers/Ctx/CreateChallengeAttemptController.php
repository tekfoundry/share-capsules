<?php

namespace App\Http\Controllers\Ctx;

use App\Ctx\Challenges\ChallengeAttemptContext;
use App\Ctx\Challenges\ChallengeAttemptOrchestrator;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ctx\CreateChallengeAttemptRequest;
use App\Models\User;
use App\Models\ViewerDevice;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\URL;

final class CreateChallengeAttemptController extends Controller
{
    public function __invoke(
        CreateChallengeAttemptRequest $request,
        ChallengeAttemptOrchestrator $orchestrator,
    ): JsonResponse {
        $user = $request->user();
        $deviceId = $user?->token()?->getAttribute('viewer_device_id');
        $device = is_string($deviceId) ? ViewerDevice::query()->find($deviceId) : null;
        if (! $user instanceof User || ! $device instanceof ViewerDevice) {
            return response()->json([
                'type' => 'ctx-error',
                'version' => 1,
                'code' => 'authentication_required',
                'retryable' => false,
            ], 401, ['Cache-Control' => 'no-store']);
        }

        $attempt = $orchestrator->create($user, $device, new ChallengeAttemptContext(
            hostOrigin: $request->string('host_origin')->toString(),
            broker: $request->string('broker')->toString(),
            capsuleId: $request->string('capsule_id')->toString(),
            capsuleRevision: $request->integer('capsule_revision'),
            policySha256: $request->string('policy_sha256')->toString(),
            payloadId: $request->string('payload_id')->toString(),
            releaseHandle: $request->string('release_handle')->toString(),
            action: $request->string('action')->toString(),
        ));

        return response()->json([
            'type' => 'ctx-challenge-attempt',
            'version' => 1,
            'attempt_id' => $attempt->getKey(),
            'expires_in' => max(1, $attempt->expires_at->getTimestamp() - CarbonImmutable::now()->getTimestamp()),
            'challenge_url' => URL::temporarySignedRoute(
                'ctx.challenge-attempts.show',
                $attempt->expires_at,
                [
                    'attempt' => $attempt->getKey(),
                    'return_to' => $request->string('return_to')->toString(),
                ],
            ),
            'challenge_set_version' => $attempt->challenge_set_version,
            'selector_version' => $attempt->selector_version,
            'scoring_model_version' => $attempt->scoring_model_version,
            'modules' => $attempt->modules->map(fn ($module): array => [
                'challenge_id' => $module->challenge_id,
                'module_version' => $module->module_version,
                'input_modes' => $module->input_modes,
            ])->values()->all(),
        ], 201, ['Cache-Control' => 'no-store']);
    }
}
