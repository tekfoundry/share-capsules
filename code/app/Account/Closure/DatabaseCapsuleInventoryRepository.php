<?php

namespace App\Account\Closure;

use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Models\CtxCapsuleReleaseCounter;
use App\Models\User;

final class DatabaseCapsuleInventoryRepository implements CapsuleInventoryRepository
{
    public function forAccount(User $user): array
    {
        return $user->creatorCapsules()
            ->whereIn('status', [
                CapsuleLifecycleStatus::Active->value,
                CapsuleLifecycleStatus::RevocationPending->value,
                CapsuleLifecycleStatus::Revoked->value,
            ])
            ->latest('finalized_at')
            ->get()
            ->map(function ($capsule): array {
                $counter = CtxCapsuleReleaseCounter::query()
                    ->where('capsule_id', $capsule->capsule_id)
                    ->where('capsule_revision', $capsule->capsule_revision)
                    ->value('committed_releases');

                return [
                    'title' => $capsule->title,
                    'management_label' => $capsule->management_label,
                    'display_name' => $capsule->management_label ?: ($capsule->title ?: 'Untitled Capsule'),
                    'content_type' => $this->contentType($capsule->content_profile_id),
                    'media_format' => $this->mediaFormat($capsule->media_type),
                    'content_profile_id' => $capsule->content_profile_id,
                    'content_profile_version' => $capsule->content_profile_version,
                    'media_type' => $capsule->media_type,
                    'capsule_id' => $capsule->capsule_id,
                    'capsule_revision' => $capsule->capsule_revision,
                    'payload_id' => $capsule->payload_id,
                    'registration_id' => $capsule->registration_id,
                    'policy_sha256' => $capsule->policy_sha256,
                    'policy' => [
                        'not_before' => $capsule->not_before?->toIso8601String(),
                        'not_after' => $capsule->not_after?->toIso8601String(),
                        'capsule_lifetime_limit' => $capsule->capsule_lifetime_limit,
                        'account_capsule_lifetime_limit' => $capsule->account_capsule_lifetime_limit,
                        'automation_risk_required' => $capsule->automation_risk_issuer !== null,
                    ],
                    'status' => $capsule->status->value,
                    'committed_releases' => (int) ($counter ?? 0),
                    'registered_at' => $capsule->finalized_at?->toIso8601String(),
                ];
            })
            ->values()
            ->all();
    }

    private function contentType(?string $profileId): string
    {
        return match ($profileId) {
            'ctx.content.static-image' => 'Image',
            null => 'Content type unavailable',
            default => 'Content',
        };
    }

    private function mediaFormat(?string $mediaType): ?string
    {
        return match ($mediaType) {
            'image/jpeg' => 'JPEG',
            'image/png' => 'PNG',
            'image/webp' => 'WebP',
            null => null,
            default => $mediaType,
        };
    }
}
