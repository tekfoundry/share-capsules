<?php

namespace Tests\Unit\Capsules;

use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Capsules\Registry\CapsuleRegistry;
use App\Capsules\Registry\CapsuleRegistryConflict;
use App\Capsules\Registry\PendingCapsuleRegistration;
use App\Ctx\Policy\CtxPolicyDigest;
use App\Models\CreatorCapsule;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

final class CapsuleRegistryTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_one_immutable_pending_revision_with_a_policy_summary(): void
    {
        $creator = User::factory()->create();
        $input = $this->registration();
        $registry = app(CapsuleRegistry::class);
        $now = CarbonImmutable::parse('2026-06-22T12:00:00Z');

        $first = $registry->createPending($creator, $input, $now);
        $second = $registry->createPending($creator, $input, $now);

        $this->assertTrue($first->is($second));
        $this->assertSame(1, CreatorCapsule::query()->count());
        $this->assertSame(CapsuleLifecycleStatus::Pending, $first->status);
        $this->assertFalse($first->status->permitsRelease());
        $this->assertSame(10, $first->capsule_lifetime_limit);
        $this->assertSame(2, $first->account_capsule_lifetime_limit);
        $this->assertSame('https://trust.example', $first->automation_risk_issuer);
        $this->assertSame('2026-06-22T12:15:00+00:00', $first->pending_expires_at->toIso8601String());
        $this->assertSame($input->policy, $first->policy);
    }

    public function test_stable_registration_and_capsule_revision_ownership_fail_closed(): void
    {
        $registry = app(CapsuleRegistry::class);
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $registry->createPending($owner, $this->registration());

        $this->expectException(CapsuleRegistryConflict::class);
        $registry->createPending($other, $this->registration());
    }

    public function test_policy_digest_mismatch_is_rejected_before_persistence(): void
    {
        $this->expectException(InvalidArgumentException::class);
        PendingCapsuleRegistration::fromValues(
            'registration_00000000000040008000000000000001',
            'urn:uuid:00000000-0000-4000-8000-000000000001',
            1,
            'primary',
            'https://broker.example',
            str_repeat('A', 43),
            $this->policy(),
        );
    }

    private function registration(): PendingCapsuleRegistration
    {
        $policy = $this->policy();

        return PendingCapsuleRegistration::fromValues(
            'registration_00000000000040008000000000000001',
            'urn:uuid:00000000-0000-4000-8000-000000000001',
            1,
            'primary',
            'https://broker.example',
            (new CtxPolicyDigest)->calculate($policy),
            $policy,
        );
    }

    /** @return array<string, mixed> */
    private function policy(): array
    {
        return [
            'type' => 'ctx-policy', 'version' => 1, 'combiner' => 'all',
            'requirements' => [
                ['predicate' => 'ctx.account.email-verified', 'equals' => true],
                ['predicate' => 'ctx.account.active', 'equals' => true],
                ['predicate' => 'ctx.viewer.device-registered', 'equals' => true],
                ['predicate' => 'ctx.consent.capsule-view-event', 'equals' => true],
                ['predicate' => 'ctx.usage.capsule-lifetime-limit', 'scope' => 'capsule', 'maximum' => 10],
                ['predicate' => 'ctx.usage.capsule-account-lifetime-limit', 'scope' => 'account-and-capsule', 'maximum' => 2],
                ['predicate' => 'ctx.risk.ecosystem-automation-not-high', 'issuer' => 'https://trust.example'],
            ],
        ];
    }
}
