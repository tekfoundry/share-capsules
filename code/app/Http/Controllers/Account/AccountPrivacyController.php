<?php

namespace App\Http\Controllers\Account;

use App\Account\Closure\AccountCapsuleInventory;
use App\Ctx\Challenges\ChallengeAttemptOrchestrator;
use App\Http\Controllers\Controller;
use App\Models\CtxChallengeAttempt;
use App\Models\CtxChallengeCadence;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class AccountPrivacyController extends Controller
{
    public function __construct(private AccountCapsuleInventory $inventory) {}

    public function export(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return $this->json([
            'type' => 'share-capsules-account-privacy-export',
            'version' => '1.0',
            'generated_at' => now()->toIso8601String(),
            'provider' => rtrim((string) config('app.url'), '/'),
            'account' => [
                'email' => $user->email,
                'status' => $user->isClosed() ? 'pending_deletion' : 'active',
                'email_verified' => $user->hasVerifiedEmail(),
                'terms_version' => $user->terms_version,
                'terms_accepted_at' => $user->terms_accepted_at?->toIso8601String(),
                'deletion_due_at' => $user->deletion_due_at?->toIso8601String(),
            ],
            'capsule_inventory' => $this->inventory->document($user),
            'viewer_devices' => $this->viewerDevices($user),
            'trust_challenge_status' => $this->challengeStatus($user),
            'privacy_controls' => [
                'correction_request' => [
                    'method' => 'POST',
                    'endpoint' => route('account.privacy.correction', absolute: false),
                    'stored_in_app' => false,
                    'contact' => 'info@tekfoundry.com',
                ],
                'appeal_request' => [
                    'method' => 'POST',
                    'endpoint' => route('account.privacy.appeal', absolute: false),
                    'stored_in_app' => false,
                    'contact' => 'info@tekfoundry.com',
                ],
                'retained_challenge_evidence_revocation' => [
                    'method' => 'DELETE',
                    'endpoint' => route('account.privacy.challenge-evidence.destroy', absolute: false),
                    'consequence' => 'Current challenge confidence is cleared; future protected openings may require a fresh challenge.',
                ],
                'account_closure_export' => [
                    'method' => 'GET',
                    'endpoint' => route('account.closure.inventory', absolute: false),
                ],
            ],
        ]);
    }

    public function correction(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return $this->json($this->requestAcknowledgement($user, 'data_correction_request'));
    }

    public function appeal(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return $this->json($this->requestAcknowledgement($user, 'appeal_request'));
    }

    public function destroyChallengeEvidence(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $now = now();

        $removed = DB::transaction(function () use ($user, $now): array {
            $attempts = CtxChallengeAttempt::query()
                ->where('user_id', $user->getKey())
                ->count();
            CtxChallengeAttempt::query()
                ->where('user_id', $user->getKey())
                ->delete();

            $cadences = CtxChallengeCadence::query()
                ->where('user_id', $user->getKey())
                ->update([
                    'challenge_success_streak' => 0,
                    'challenge_refresh_tier' => ChallengeAttemptOrchestrator::CADENCE_TIER_STANDARD,
                    'last_challenge_score' => null,
                    'challenge_expires_at' => $now,
                    'last_reset_reason' => 'account_privacy_evidence_revoked',
                    'updated_at' => $now,
                ]);

            return ['attempts' => $attempts, 'cadences' => $cadences];
        });

        return $this->json([
            'type' => 'share-capsules-account-privacy-control-result',
            'version' => '1.0',
            'control' => 'retained_challenge_evidence_revocation',
            'removed' => $removed,
            'consequence' => 'Current challenge confidence is cleared; future protected openings may require a fresh challenge.',
        ]);
    }

    private function json(array $payload): JsonResponse
    {
        return response()->json($payload, headers: ['Cache-Control' => 'no-store, private']);
    }

    private function viewerDevices(User $user): array
    {
        return $user->viewerDevices()
            ->orderBy('created_at')
            ->get()
            ->map(fn ($device): array => [
                'id' => $device->getKey(),
                'name' => $device->name,
                'status' => $device->status->value,
                'last_used_at' => $device->last_used_at?->toIso8601String(),
                'suspended_at' => $device->suspended_at?->toIso8601String(),
                'revoked_at' => $device->revoked_at?->toIso8601String(),
                'proof_key_thumbprint' => $device->proof_jkt,
                'agreement_key_thumbprint' => $device->agreement_jkt,
            ])
            ->values()
            ->all();
    }

    private function challengeStatus(User $user): array
    {
        $retainedAttempts = CtxChallengeAttempt::query()
            ->where('user_id', $user->getKey())
            ->count();
        $currentCadences = CtxChallengeCadence::query()
            ->where('user_id', $user->getKey())
            ->where('challenge_expires_at', '>', now())
            ->count();

        return [
            'retained_attempt_count' => $retainedAttempts,
            'current_cadence_count' => $currentCadences,
            'retention_purpose' => ChallengeAttemptOrchestrator::RETENTION_PURPOSE,
            'retention_window' => ChallengeAttemptOrchestrator::RETENTION_AFTER_EXPIRY_HOURS.' hours after challenge expiry',
            'raw_interaction_telemetry_retained' => false,
            'current_challenge_confidence' => $currentCadences > 0 ? 'present' : 'none',
        ];
    }

    private function requestAcknowledgement(User $user, string $requestType): array
    {
        return [
            'type' => 'share-capsules-account-privacy-request',
            'version' => '1.0',
            'request_type' => $requestType,
            'account_email' => $user->email,
            'stored_in_app' => false,
            'contact' => 'info@tekfoundry.com',
            'next_step' => 'Use the listed contact address with the request type and account email. Do not include passwords, recovery codes, private keys, content keys, DPoP proofs, or authorization tickets.',
        ];
    }
}
