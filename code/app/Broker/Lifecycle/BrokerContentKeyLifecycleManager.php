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
    ): int {
        return DB::connection('broker')->transaction(function () use (
            $operation,
            $creatorId,
            $capsuleId,
            $capsuleRevision,
        ): int {
            $query = BrokerContentKey::query()->where('creator_id', $creatorId);
            if ($operation === BrokerContentKeyOperation::RevokeCapsule) {
                $query->where('capsule_id', $capsuleId)
                    ->where('capsule_revision', $capsuleRevision);
            }

            $records = $query->lockForUpdate()->get();
            $changed = 0;
            foreach ($records as $record) {
                $attributes = $this->transition($record, $operation);
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
    ): array {
        return match ($operation) {
            BrokerContentKeyOperation::PauseCreator => $record->status === BrokerContentKeyStatus::Active
                ? ['status' => BrokerContentKeyStatus::Paused, 'paused_at' => now()]
                : [],
            BrokerContentKeyOperation::ResumeCreator => $record->status === BrokerContentKeyStatus::Paused
                ? ['status' => BrokerContentKeyStatus::Active, 'paused_at' => null]
                : [],
            BrokerContentKeyOperation::RevokeCapsule => in_array($record->status, [BrokerContentKeyStatus::Active, BrokerContentKeyStatus::Paused], true)
                ? ['status' => BrokerContentKeyStatus::Revoked, 'revoked_at' => now(), 'paused_at' => null]
                : [],
            BrokerContentKeyOperation::DestroyCreator => $record->status !== BrokerContentKeyStatus::Destroyed
                ? [
                    'creator_id' => null,
                    'status' => BrokerContentKeyStatus::Destroyed,
                    'paused_at' => null,
                    'destroyed_at' => now(),
                    'protection_algorithm' => null,
                    'protection_key_id' => null,
                    'protection_nonce' => null,
                    'protected_content_key' => null,
                ]
                : [],
        };
    }
}
