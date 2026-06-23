<?php

namespace App\Broker\Lifecycle;

interface BrokerContentKeyLifecycle
{
    public function pauseCreator(int $creatorId): void;

    public function resumeCreator(int $creatorId): void;

    public function revokeCapsule(int $creatorId, string $capsuleId, int $capsuleRevision): void;

    public function destroyCapsule(int $creatorId, string $capsuleId, int $capsuleRevision): void;

    public function destroyCreator(int $creatorId): void;

    public function finalizeRegistration(int $creatorId, string $registrationId, string $releaseHandle): void;

    public function cancelRegistration(int $creatorId, string $registrationId): void;
}
