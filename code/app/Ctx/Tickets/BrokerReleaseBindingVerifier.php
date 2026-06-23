<?php

namespace App\Ctx\Tickets;

use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Models\CreatorCapsule;
use Illuminate\Http\Client\Factory;
use Throwable;

final readonly class BrokerReleaseBindingVerifier implements ReleaseBindingVerifier
{
    public function __construct(private Factory $http) {}

    public function valid(CtxTicketBindings $bindings): bool
    {
        $registered = CreatorCapsule::query()
            ->where('capsule_id', $bindings->capsuleId)
            ->where('capsule_revision', $bindings->capsuleRevision)
            ->where('payload_id', $bindings->payloadId)
            ->where('broker', $bindings->broker)
            ->where('release_handle', $bindings->releaseHandle)
            ->where('policy_sha256', $bindings->policySha256)
            ->where('status', CapsuleLifecycleStatus::Active->value)
            ->exists();
        if (! $registered) {
            return false;
        }

        try {
            $response = $this->http
                ->baseUrl(rtrim((string) config('sharecapsules.broker.internal_url'), '/'))
                ->acceptJson()
                ->asJson()
                ->withToken((string) config('sharecapsules.broker.control_plane_token'))
                ->timeout(5)
                ->retry(2, 100, throw: false)
                ->post('/internal/release-bindings/validate', [
                    'capsule_id' => $bindings->capsuleId,
                    'capsule_revision' => $bindings->capsuleRevision,
                    'policy_sha256' => $bindings->policySha256,
                    'payload_id' => $bindings->payloadId,
                    'release_handle' => $bindings->releaseHandle,
                ]);

            return $response->successful() && $response->json('valid') === true;
        } catch (Throwable) {
            return false;
        }
    }
}
