<?php

namespace App\Capsules\Registry;

use App\Models\CreatorCapsule;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

final class CapsuleRegistry
{
    public function createPending(
        User $creator,
        PendingCapsuleRegistration $registration,
        ?CarbonImmutable $now = null,
    ): CreatorCapsule {
        $now ??= CarbonImmutable::now();
        $ttl = (int) config('sharecapsules.capsules.pending_ttl_minutes');
        if ($ttl < 1 || $ttl > 1_440) {
            throw new CapsuleRegistryConflict('The pending Capsule lifetime is not safely configured.');
        }

        try {
            return DB::transaction(function () use ($creator, $registration, $now, $ttl): CreatorCapsule {
                $existing = CreatorCapsule::query()
                    ->where('registration_id', $registration->registrationId)
                    ->lockForUpdate()
                    ->first();
                if ($existing instanceof CreatorCapsule) {
                    $this->assertSameRegistration($existing, $creator, $registration);

                    return $existing;
                }

                return CreatorCapsule::query()->create([
                    'user_id' => $creator->getKey(),
                    'registration_id' => $registration->registrationId,
                    'capsule_id' => $registration->capsuleId,
                    'capsule_revision' => $registration->capsuleRevision,
                    'payload_id' => $registration->payloadId,
                    'title' => $registration->title,
                    'content_profile_id' => $registration->contentProfileId,
                    'content_profile_version' => $registration->contentProfileVersion,
                    'media_type' => $registration->mediaType,
                    'broker' => $registration->broker,
                    'policy_sha256' => $registration->policySha256,
                    'policy' => $registration->policy,
                    'not_before' => $registration->summary->notBefore,
                    'not_after' => $registration->summary->notAfter,
                    'capsule_lifetime_limit' => $registration->summary->capsuleLifetimeLimit,
                    'account_capsule_lifetime_limit' => $registration->summary->accountCapsuleLifetimeLimit,
                    'automation_risk_issuer' => $registration->summary->automationRiskIssuer,
                    'status' => CapsuleLifecycleStatus::Pending,
                    'pending_expires_at' => $now->addMinutes($ttl),
                ]);
            }, 3);
        } catch (UniqueConstraintViolationException) {
            throw new CapsuleRegistryConflict('The Capsule revision or registration identifier is already owned.');
        }
    }

    private function assertSameRegistration(
        CreatorCapsule $existing,
        User $creator,
        PendingCapsuleRegistration $registration,
    ): void {
        if ((string) $existing->user_id !== (string) $creator->getKey()
            || ! hash_equals($existing->capsule_id, $registration->capsuleId)
            || $existing->capsule_revision !== $registration->capsuleRevision
            || ! hash_equals($existing->payload_id, $registration->payloadId)
            || ! hash_equals($existing->broker, $registration->broker)
            || ! hash_equals($existing->policy_sha256, $registration->policySha256)
            || $existing->title !== $registration->title
            || $existing->content_profile_id !== $registration->contentProfileId
            || $existing->content_profile_version !== $registration->contentProfileVersion
            || $existing->media_type !== $registration->mediaType) {
            throw new CapsuleRegistryConflict('The stable registration identifier was reused with different bindings.');
        }
    }
}
