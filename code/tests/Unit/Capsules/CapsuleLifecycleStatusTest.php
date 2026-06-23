<?php

namespace Tests\Unit\Capsules;

use App\Capsules\Registry\CapsuleLifecycleStatus;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class CapsuleLifecycleStatusTest extends TestCase
{
    public function test_only_active_capsules_permit_release(): void
    {
        foreach (CapsuleLifecycleStatus::cases() as $status) {
            $this->assertSame($status === CapsuleLifecycleStatus::Active, $status->permitsRelease());
        }
    }

    #[DataProvider('transitions')]
    public function test_the_closed_lifecycle_allows_only_reviewed_forward_transitions(
        CapsuleLifecycleStatus $from,
        CapsuleLifecycleStatus $to,
        bool $allowed,
    ): void {
        $this->assertSame($allowed, $from->canTransitionTo($to));
    }

    /** @return iterable<string, array{CapsuleLifecycleStatus, CapsuleLifecycleStatus, bool}> */
    public static function transitions(): iterable
    {
        yield 'pending activates' => [CapsuleLifecycleStatus::Pending, CapsuleLifecycleStatus::Active, true];
        yield 'pending cleans up' => [CapsuleLifecycleStatus::Pending, CapsuleLifecycleStatus::CleanupPending, true];
        yield 'active begins revocation' => [CapsuleLifecycleStatus::Active, CapsuleLifecycleStatus::RevocationPending, true];
        yield 'revocation completes' => [CapsuleLifecycleStatus::RevocationPending, CapsuleLifecycleStatus::Revoked, true];
        yield 'revoked cleans up for deletion' => [CapsuleLifecycleStatus::Revoked, CapsuleLifecycleStatus::CleanupPending, true];
        yield 'cleanup completes destruction' => [CapsuleLifecycleStatus::CleanupPending, CapsuleLifecycleStatus::Destroyed, true];
        yield 'active cannot become pending' => [CapsuleLifecycleStatus::Active, CapsuleLifecycleStatus::Pending, false];
        yield 'active can clean up an abandoned finalized build' => [CapsuleLifecycleStatus::Active, CapsuleLifecycleStatus::CleanupPending, true];
        yield 'revoked cannot reactivate' => [CapsuleLifecycleStatus::Revoked, CapsuleLifecycleStatus::Active, false];
        yield 'destroyed is terminal' => [CapsuleLifecycleStatus::Destroyed, CapsuleLifecycleStatus::Active, false];
    }
}
