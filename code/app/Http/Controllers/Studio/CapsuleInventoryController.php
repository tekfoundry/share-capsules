<?php

namespace App\Http\Controllers\Studio;

use App\Broker\Lifecycle\CapsuleRevocationService;
use App\Capsules\Registry\CapsuleDeletionService;
use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Http\Controllers\Controller;
use App\Models\CreatorCapsule;
use App\Models\CtxCapsuleMetricBucket;
use App\Models\CtxCapsuleMetricDenial;
use App\Models\CtxCapsuleMetricProjection;
use App\Models\CtxCapsuleReleaseCounter;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

final class CapsuleInventoryController extends Controller
{
    public function index(Request $request): View
    {
        /** @var User $user */
        $user = $request->user();

        $capsules = $user->creatorCapsules()
            ->whereIn('status', [
                CapsuleLifecycleStatus::Active->value,
                CapsuleLifecycleStatus::RevocationPending->value,
                CapsuleLifecycleStatus::Revoked->value,
            ])
            ->latest('finalized_at')
            ->paginate(10)
            ->withQueryString();

        $capsules->through(fn (CreatorCapsule $capsule): array => $this->formatCapsuleRow($capsule));

        return view('studio.capsules.index', ['capsules' => $capsules]);
    }

    public function revoke(Request $request, CapsuleRevocationService $revocation): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validate([
            'capsule_id' => ['required', 'string', 'max:45'],
            'capsule_revision' => ['required', 'integer', 'min:1'],
        ]);
        $owned = $user->creatorCapsules()
            ->where('status', CapsuleLifecycleStatus::Active->value)
            ->where('capsule_id', $validated['capsule_id'])
            ->where('capsule_revision', $validated['capsule_revision'])
            ->exists();
        abort_unless($owned, 404);

        $revocation->revoke($user, $validated['capsule_id'], $validated['capsule_revision']);

        return back()->with('status', 'Capsule access has been permanently revoked.');
    }

    public function destroy(
        Request $request,
        string $capsuleId,
        int $revision,
        CapsuleDeletionService $deletion,
    ): RedirectResponse {
        /** @var User $user */
        $user = $request->user();
        $deletion->delete($user, $capsuleId, $revision);

        return to_route('studio.capsules.index')
            ->with('status', 'Capsule deleted. Its content key has been permanently destroyed.');
    }

    public function updateLabel(Request $request, string $capsuleId, int $revision): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validate([
            'management_label' => ['nullable', 'string', 'max:200'],
        ]);
        abort_unless(array_keys($request->except('_token', '_method')) === ['management_label'], 422);

        $capsule = CreatorCapsule::query()
            ->where('user_id', $user->getKey())
            ->where('capsule_id', $capsuleId)
            ->where('capsule_revision', $revision)
            ->whereNotIn('status', [
                CapsuleLifecycleStatus::Pending->value,
                CapsuleLifecycleStatus::CleanupPending->value,
                CapsuleLifecycleStatus::Destroyed->value,
            ])
            ->firstOrFail();
        $label = trim((string) ($validated['management_label'] ?? ''));
        $capsule->forceFill(['management_label' => $label === '' ? null : $label])->save();

        return back()->with('status', 'Capsule label updated.');
    }

    public function metrics(Request $request, string $capsuleId, int $revision): View
    {
        /** @var User $user */
        $user = $request->user();
        $capsule = CreatorCapsule::query()->where('user_id', $user->getKey())
            ->where('capsule_id', $capsuleId)->where('capsule_revision', $revision)
            ->whereNotIn('status', [
                CapsuleLifecycleStatus::Pending->value,
                CapsuleLifecycleStatus::CleanupPending->value,
                CapsuleLifecycleStatus::Destroyed->value,
            ])
            ->firstOrFail();
        $provider = (string) config('sharecapsules.ctx.issuer');
        $providerKey = sodium_bin2base64(hash('sha256', $provider, true), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
        $scope = fn ($query) => $query->where('provider_key', $providerKey)
            ->where('capsule_id', $capsuleId)->where('capsule_revision', $revision);
        $projection = $scope(CtxCapsuleMetricProjection::query())->first();
        $pressure = null;

        return view('studio.capsules.metrics', [
            'capsuleId' => $capsuleId, 'revision' => $revision, 'projection' => $projection,
            'committed' => (int) (CtxCapsuleReleaseCounter::query()->where('capsule_id', $capsuleId)->where('capsule_revision', $revision)->value('committed_releases') ?? 0),
            'capsuleLimit' => $capsule->capsule_lifetime_limit,
            'buckets' => $scope(CtxCapsuleMetricBucket::query())->latest('bucket_start')->limit(24)->get()->reverse(),
            'denials' => $scope(CtxCapsuleMetricDenial::query())->orderByDesc('occurrences')->get(),
            'pressure' => $pressure, 'accountCohort' => null,
        ]);
    }

    /** @return array<string, mixed> */
    private function formatCapsuleRow(CreatorCapsule $capsule): array
    {
        $counter = CtxCapsuleReleaseCounter::query()
            ->where('capsule_id', $capsule->capsule_id)
            ->where('capsule_revision', $capsule->capsule_revision)
            ->value('committed_releases');
        $badges = $this->policyBadges($capsule);

        return [
            'title' => $capsule->title,
            'management_label' => $capsule->management_label,
            'display_name' => $capsule->management_label ?: ($capsule->title ?: 'Untitled Capsule'),
            'content_type' => $this->contentType($capsule->content_profile_id),
            'media_format' => $this->mediaFormat($capsule->media_type),
            'capsule_id' => $capsule->capsule_id,
            'capsule_revision' => $capsule->capsule_revision,
            'status' => $capsule->status->value,
            'policy' => [
                'not_before' => $capsule->not_before?->toIso8601String(),
                'not_after' => $capsule->not_after?->toIso8601String(),
                'capsule_lifetime_limit' => $capsule->capsule_lifetime_limit,
                'account_capsule_lifetime_limit' => $capsule->account_capsule_lifetime_limit,
                'automation_risk_required' => $capsule->automation_risk_issuer !== null,
            ],
            'policy_badges' => $badges,
            'policy_descriptions' => $this->policyDescriptions($capsule),
            'committed_releases' => (int) ($counter ?? 0),
            'registered_at' => $capsule->finalized_at?->toFormattedDateString(),
        ];
    }

    /** @return list<string> */
    private function policyBadges(CreatorCapsule $capsule): array
    {
        $badges = [];
        if ($capsule->not_before !== null || $capsule->not_after !== null) {
            $badges[] = 'Time';
        }
        if ($capsule->capsule_lifetime_limit !== null || $capsule->account_capsule_lifetime_limit !== null) {
            $badges[] = 'Limit';
        }
        if ($capsule->automation_risk_issuer !== null) {
            $badges[] = 'Trust';
        }

        return $badges;
    }

    /** @return array<string, string> */
    private function policyDescriptions(CreatorCapsule $capsule): array
    {
        $descriptions = [];
        if ($capsule->not_before !== null || $capsule->not_after !== null) {
            $descriptions['Time'] = match (true) {
                $capsule->not_before !== null && $capsule->not_after !== null => 'Time policy: opens from '.$capsule->not_before->toFormattedDateString().' through '.$capsule->not_after->toFormattedDateString().'.',
                $capsule->not_before !== null => 'Time policy: opens starting '.$capsule->not_before->toFormattedDateString().'.',
                default => 'Time policy: opens through '.$capsule->not_after->toFormattedDateString().'.',
            };
        }
        if ($capsule->capsule_lifetime_limit !== null || $capsule->account_capsule_lifetime_limit !== null) {
            $descriptions['Limit'] = match (true) {
                $capsule->capsule_lifetime_limit !== null && $capsule->account_capsule_lifetime_limit !== null => 'Limit policy: up to '.number_format($capsule->capsule_lifetime_limit).' total views and '.number_format($capsule->account_capsule_lifetime_limit).' views per viewer account.',
                $capsule->capsule_lifetime_limit !== null => 'Limit policy: up to '.number_format($capsule->capsule_lifetime_limit).' total views across all viewer accounts.',
                default => 'Limit policy: up to '.number_format($capsule->account_capsule_lifetime_limit).' views per viewer account.',
            };
        }
        if ($capsule->automation_risk_issuer !== null) {
            $descriptions['Trust'] = 'Trust policy: viewer trust check required before content opens.';
        }

        return $descriptions;
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
