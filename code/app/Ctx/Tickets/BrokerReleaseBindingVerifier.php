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

        foreach ($this->brokerBaseUrls() as $baseUrl) {
            try {
                $response = $this->http
                    ->baseUrl($baseUrl)
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

                if ($response->successful()) {
                    return $response->json('valid') === true;
                }
            } catch (Throwable) {
                continue;
            }
        }

        return false;
    }

    /** @return list<string> */
    private function brokerBaseUrls(): array
    {
        return array_values(array_unique(array_filter([
            rtrim((string) config('sharecapsules.broker.internal_url'), '/'),
            rtrim((string) config('sharecapsules.broker.base_url'), '/'),
        ])));
    }
}
