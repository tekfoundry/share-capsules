<?php

namespace App\Broker\Lifecycle;

use App\Broker\Audit\BrokerAuditSink;
use App\Models\BrokerContentKey;
use Illuminate\Support\Facades\DB;

final readonly class BrokerContentKeyLifecycleManager
{
    public function __construct(private BrokerAuditSink $audit) {}

    public function apply(
        BrokerContentKeyOperation $operation,
        string $creatorId,
        ?string $capsuleId = null,
        ?int $capsuleRevision = null,
        ?string $registrationId = null,
        ?string $releaseHandle = null,
    ): int {
        return DB::connection('broker')->transaction(function () use (
            $operation,
            $creatorId,
            $capsuleId,
            $capsuleRevision,
            $registrationId,
            $releaseHandle,
        ): int {
            $query = BrokerContentKey::query()->where('creator_id', $creatorId);
            if (in_array($operation, [BrokerContentKeyOperation::RevokeCapsule, BrokerContentKeyOperation::DestroyCapsule], true)) {
                $query->where('capsule_id', $capsuleId)
                    ->where('capsule_revision', $capsuleRevision);
            }
            if (in_array($operation, [BrokerContentKeyOperation::FinalizeRegistration, BrokerContentKeyOperation::CancelRegistration], true)) {
                $query->where('registration_id', $registrationId);
            }

            $records = $query->lockForUpdate()->get();
            if ($operation === BrokerContentKeyOperation::FinalizeRegistration) {
                $record = $records->sole();
                if (! is_string($releaseHandle)
                    || ! hash_equals($record->release_handle, $releaseHandle)
                    || ! in_array($record->status, [BrokerContentKeyStatus::Pending, BrokerContentKeyStatus::Active], true)) {
                    throw new BrokerContentKeyLifecycleFailed('The pending registration cannot be finalized.');
                }
            }
            $changed = 0;
            foreach ($records as $record) {
                $attributes = $this->transition($record, $operation, $releaseHandle);
                if ($attributes === []) {
                    continue;
                }
                $record->forceFill($attributes)->save();
                $changed++;
            }

            $this->audit->record('broker.content_key_lifecycle_applied', [
                'operation' => $operation->value,
                'capsule_id' => $capsuleId,
                'capsule_revision' => $capsuleRevision,
                'matched_records' => $records->count(),
                'changed_records' => $changed,
            ]);

            return $changed;
        }, 3);
    }

    /** @return array<string, mixed> */
    private function transition(
        BrokerContentKey $record,
        BrokerContentKeyOperation $operation,
        ?string $releaseHandle,
    ): array {
        return match ($operation) {
            BrokerContentKeyOperation::FinalizeRegistration => $record->status === BrokerContentKeyStatus::Pending
                && is_string($releaseHandle) && hash_equals($record->release_handle, $releaseHandle)
                    ? ['status' => BrokerContentKeyStatus::Active, 'pending_expires_at' => null, 'finalized_at' => now()]
                    : [],
            BrokerContentKeyOperation::CancelRegistration => $record->status !== BrokerContentKeyStatus::Destroyed
                ? $this->destroyedAttributes()
                : [],
            BrokerContentKeyOperation::PauseCreator => $record->status === BrokerContentKeyStatus::Active
                ? ['status' => BrokerContentKeyStatus::Paused, 'paused_at' => now()]
                : [],
            BrokerContentKeyOperation::ResumeCreator => $record->status === BrokerContentKeyStatus::Paused
                ? ['status' => BrokerContentKeyStatus::Active, 'paused_at' => null]
                : [],
            BrokerContentKeyOperation::RevokeCapsule => in_array($record->status, [BrokerContentKeyStatus::Active, BrokerContentKeyStatus::Paused], true)
                ? ['status' => BrokerContentKeyStatus::Revoked, 'revoked_at' => now(), 'paused_at' => null]
                : [],
            BrokerContentKeyOperation::DestroyCapsule,
            BrokerContentKeyOperation::DestroyCreator => $record->status !== BrokerContentKeyStatus::Destroyed
                ? $this->destroyedAttributes()
                : [],
        };
    }

    /** @return array<string, mixed> */
    private function destroyedAttributes(): array
    {
        return [
            'creator_id' => null,
            'status' => BrokerContentKeyStatus::Destroyed,
            'paused_at' => null,
            'pending_expires_at' => null,
            'destroyed_at' => now(),
            'protection_algorithm' => null,
            'protection_key_id' => null,
            'protection_nonce' => null,
            'protected_content_key' => null,
        ];
    }
}
