<?php

namespace Tests\Support;

use App\Broker\Lifecycle\BrokerContentKeyLifecycle;

final class FakeBrokerContentKeyLifecycle implements BrokerContentKeyLifecycle
{
    /** @var list<array{operation: string, creator_id: int, capsule_id?: string, capsule_revision?: int}> */
    public array $operations = [];

    public function pauseCreator(int $creatorId): void
    {
        $this->operations[] = ['operation' => 'pause_creator', 'creator_id' => $creatorId];
    }

    public function resumeCreator(int $creatorId): void
    {
        $this->operations[] = ['operation' => 'resume_creator', 'creator_id' => $creatorId];
    }

    public function revokeCapsule(int $creatorId, string $capsuleId, int $capsuleRevision): void
    {
        $this->operations[] = [
            'operation' => 'revoke_capsule',
            'creator_id' => $creatorId,
            'capsule_id' => $capsuleId,
            'capsule_revision' => $capsuleRevision,
        ];
    }

    public function destroyCreator(int $creatorId): void
    {
        $this->operations[] = ['operation' => 'destroy_creator', 'creator_id' => $creatorId];
    }
}
