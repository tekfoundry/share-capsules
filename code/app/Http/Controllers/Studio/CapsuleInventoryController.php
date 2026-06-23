<?php

namespace App\Http\Controllers\Studio;

use App\Account\Closure\CapsuleInventoryRepository;
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
    public function index(Request $request, CapsuleInventoryRepository $inventory): View
    {
        /** @var User $user */
        $user = $request->user();

        return view('studio.capsules.index', ['capsules' => $inventory->forAccount($user)]);
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
}
