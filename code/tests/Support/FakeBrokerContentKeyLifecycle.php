<?php

namespace Tests\Support;

use App\Broker\Lifecycle\BrokerContentKeyLifecycle;

final class FakeBrokerContentKeyLifecycle implements BrokerContentKeyLifecycle
{
    /** @var list<array<string, int|string>> */
    public array $operations = [];

    /** @var list<string> */
    public array $failOperations = [];

    public function pauseCreator(int $creatorId): void
    {
        $this->failWhenRequested('pause_creator');
        $this->operations[] = ['operation' => 'pause_creator', 'creator_id' => $creatorId];
    }

    public function resumeCreator(int $creatorId): void
    {
        $this->failWhenRequested('resume_creator');
        $this->operations[] = ['operation' => 'resume_creator', 'creator_id' => $creatorId];
    }

    public function revokeCapsule(int $creatorId, string $capsuleId, int $capsuleRevision): void
    {
        $this->failWhenRequested('revoke_capsule');
        $this->operations[] = [
            'operation' => 'revoke_capsule',
            'creator_id' => $creatorId,
            'capsule_id' => $capsuleId,
            'capsule_revision' => $capsuleRevision,
        ];
    }

    public function destroyCapsule(int $creatorId, string $capsuleId, int $capsuleRevision): void
    {
        $this->failWhenRequested('destroy_capsule');
        $this->operations[] = [
            'operation' => 'destroy_capsule',
            'creator_id' => $creatorId,
            'capsule_id' => $capsuleId,
            'capsule_revision' => $capsuleRevision,
        ];
    }

    public function destroyCreator(int $creatorId): void
    {
        $this->failWhenRequested('destroy_creator');
        $this->operations[] = ['operation' => 'destroy_creator', 'creator_id' => $creatorId];
    }

    public function finalizeRegistration(int $creatorId, string $registrationId, string $releaseHandle): void
    {
        $this->failWhenRequested('finalize_registration');
        $this->operations[] = [
            'operation' => 'finalize_registration',
            'creator_id' => $creatorId,
            'registration_id' => $registrationId,
            'release_handle' => $releaseHandle,
        ];
    }

    public function cancelRegistration(int $creatorId, string $registrationId): void
    {
        $this->failWhenRequested('cancel_registration');
        $this->operations[] = [
            'operation' => 'cancel_registration',
            'creator_id' => $creatorId,
            'registration_id' => $registrationId,
        ];
    }

    private function failWhenRequested(string $operation): void
    {
        if (in_array($operation, $this->failOperations, true)) {
            throw new \RuntimeException("Broker {$operation} failed.");
        }
    }
}
