<?php

namespace App\Account\Closure;

use App\Models\User;

final readonly class AccountCapsuleInventory
{
    public function __construct(private CapsuleInventoryRepository $capsules) {}

    /** @return array<string, mixed> */
    public function document(User $user): array
    {
        $capsules = $this->capsules->forAccount($user);

        return [
            'type' => 'share-capsules-account-capsule-inventory',
            'version' => '1.0',
            'generated_at' => now()->toIso8601String(),
            'provider' => rtrim((string) config('app.url'), '/'),
            'account_status' => $user->isClosed() ? 'pending_deletion' : 'active',
            'deletion_due_at' => $user->deletion_due_at?->toIso8601String(),
            'capsule_count' => count($capsules),
            'capsules' => $capsules,
        ];
    }
}
