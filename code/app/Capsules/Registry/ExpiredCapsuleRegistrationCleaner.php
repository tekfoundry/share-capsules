<?php

namespace App\Capsules\Registry;

use App\Models\CreatorCapsule;
use App\Models\User;
use Carbon\CarbonImmutable;
use Throwable;

final readonly class ExpiredCapsuleRegistrationCleaner
{
    public function __construct(private CapsuleRegistrationLifecycle $lifecycle) {}

    /** @return array{cleaned: int, failed: int} */
    public function clean(int $limit = 100, ?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();
        if ($limit < 1 || $limit > 1_000) {
            return ['cleaned' => 0, 'failed' => 0];
        }
        $records = CreatorCapsule::query()
            ->where(function ($query) use ($now): void {
                $query->where(fn ($pending) => $pending
                    ->where('status', CapsuleLifecycleStatus::Pending->value)
                    ->where('pending_expires_at', '<=', $now))
                    ->orWhere('status', CapsuleLifecycleStatus::CleanupPending->value);
            })
            ->orderBy('id')->limit($limit)->get();
        $cleaned = 0;
        $failed = 0;
        foreach ($records as $record) {
            try {
                $creator = User::query()->find($record->user_id);
                if (! $creator instanceof User) {
                    $failed++;

                    continue;
                }
                $this->lifecycle->cancel($creator, $record->registration_id, $now);
                $cleaned++;
            } catch (Throwable $exception) {
                report($exception);
                $failed++;
            }
        }

        return compact('cleaned', 'failed');
    }
}
