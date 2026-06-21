<?php

namespace App\Broker\Lifecycle;

use Illuminate\Http\Client\Factory;
use Throwable;

final readonly class HttpBrokerContentKeyLifecycle implements BrokerContentKeyLifecycle
{
    public function __construct(private Factory $http) {}

    public function pauseCreator(int $creatorId): void
    {
        $this->apply(BrokerContentKeyOperation::PauseCreator, $creatorId);
    }

    public function resumeCreator(int $creatorId): void
    {
        $this->apply(BrokerContentKeyOperation::ResumeCreator, $creatorId);
    }

    public function revokeCapsule(int $creatorId, string $capsuleId, int $capsuleRevision): void
    {
        $this->apply(BrokerContentKeyOperation::RevokeCapsule, $creatorId, $capsuleId, $capsuleRevision);
    }

    public function destroyCreator(int $creatorId): void
    {
        $this->apply(BrokerContentKeyOperation::DestroyCreator, $creatorId);
    }

    private function apply(
        BrokerContentKeyOperation $operation,
        int $creatorId,
        ?string $capsuleId = null,
        ?int $capsuleRevision = null,
    ): void {
        $body = [
            'operation' => $operation->value,
            'creator_id' => (string) $creatorId,
        ];
        if ($operation === BrokerContentKeyOperation::RevokeCapsule) {
            $body['capsule_id'] = $capsuleId;
            $body['capsule_revision'] = $capsuleRevision;
        }

        try {
            $response = $this->http
                ->baseUrl(rtrim((string) config('sharecapsules.broker.base_url'), '/'))
                ->acceptJson()
                ->asJson()
                ->withToken((string) config('sharecapsules.broker.control_plane_token'))
                ->timeout(5)
                ->retry(2, 100, throw: false)
                ->post('/internal/content-keys/lifecycle', $body);
        } catch (Throwable $exception) {
            throw new BrokerContentKeyLifecycleFailed('The broker lifecycle operation is unavailable.', 0, $exception);
        }

        if (! $response->successful() || $response->json('applied') !== true) {
            throw new BrokerContentKeyLifecycleFailed('The broker rejected the lifecycle operation.');
        }
    }
}
