<?php

namespace App\Ctx\Risk;

use App\Models\CtxAuthorizationTicket;
use App\Models\CtxAutomationRiskActivity;
use App\Models\User;
use App\Models\ViewerDevice;
use Carbon\CarbonImmutable;

final readonly class AutomationRiskActivityRecorder
{
    public function __construct(private AutomationRiskActivityIdentifierSource $identifiers) {}

    public function record(
        AutomationRiskActivityType $type,
        User $user,
        ViewerDevice $device,
        string $capsuleId,
        int $capsuleRevision,
        ?CarbonImmutable $occurredAt = null,
    ): void {
        $this->persist(
            $type,
            (int) $user->getKey(),
            (string) $device->getKey(),
            $capsuleId,
            $capsuleRevision,
            $occurredAt ?? CarbonImmutable::now(),
        );
    }

    public function recordTicket(
        AutomationRiskActivityType $type,
        CtxAuthorizationTicket $ticket,
        ?CarbonImmutable $occurredAt = null,
    ): void {
        $this->persist(
            $type,
            (int) $ticket->user_id,
            (string) $ticket->viewer_device_id,
            $ticket->capsule_id,
            $ticket->capsule_revision,
            $occurredAt ?? CarbonImmutable::now(),
        );
    }

    private function persist(
        AutomationRiskActivityType $type,
        int $userId,
        string $viewerDeviceId,
        string $capsuleId,
        int $capsuleRevision,
        CarbonImmutable $occurredAt,
    ): void {
        CtxAutomationRiskActivity::query()->create([
            'event_id' => $this->identifiers->identifier(),
            'user_id' => $userId,
            'viewer_device_id' => $viewerDeviceId,
            'activity_type' => $type,
            'capsule_id' => $capsuleId,
            'capsule_revision' => $capsuleRevision,
            'occurred_at' => $occurredAt,
        ]);
    }
}
