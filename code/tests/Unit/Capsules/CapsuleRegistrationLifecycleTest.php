<?php

namespace Tests\Unit\Capsules;

use App\Broker\Lifecycle\BrokerContentKeyLifecycle;
use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Capsules\Registry\CapsuleRegistrationLifecycle;
use App\Capsules\Registry\CapsuleRegistry;
use App\Capsules\Registry\CapsuleRegistryConflict;
use App\Capsules\Registry\ExpiredCapsuleRegistrationCleaner;
use App\Capsules\Registry\PendingCapsuleRegistration;
use App\Ctx\Policy\CtxPolicyDigest;
use App\Models\CreatorCapsule;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\Support\FakeBrokerContentKeyLifecycle;
use Tests\TestCase;

final class CapsuleRegistrationLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_finalization_is_owned_bounded_and_idempotent(): void
    {
        [$creator, $capsule] = $this->pending();
        $broker = $this->broker();
        $lifecycle = app(CapsuleRegistrationLifecycle::class);
        $handle = str_repeat('h', 43);

        $first = $lifecycle->finalize($creator, $capsule->registration_id, $handle);
        $second = $lifecycle->finalize($creator, $capsule->registration_id, $handle);

        $this->assertSame(CapsuleLifecycleStatus::Active, $first->status);
        $this->assertTrue($first->is($second));
        $this->assertNotNull($first->pending_expires_at);
        $this->assertNotNull($first->finalized_at);
        $this->assertCount(1, $broker->operations);
    }

    public function test_expired_or_differently_owned_registration_cannot_be_finalized(): void
    {
        [$creator, $capsule] = $this->pending(CarbonImmutable::now()->subHour());
        $other = User::factory()->create();
        $lifecycle = app(CapsuleRegistrationLifecycle::class);

        try {
            $lifecycle->finalize($other, $capsule->registration_id, str_repeat('h', 43));
            $this->fail('Different ownership should fail closed.');
        } catch (CapsuleRegistryConflict) {
            $this->assertSame(CapsuleLifecycleStatus::Pending, $capsule->fresh()->status);
        }

        $this->expectException(CapsuleRegistryConflict::class);
        $lifecycle->finalize($creator, $capsule->registration_id, str_repeat('h', 43));
    }

    public function test_failed_cancellation_remains_retryable_and_cleanup_completes_it(): void
    {
        [$creator, $capsule] = $this->pending(CarbonImmutable::now()->subHour());
        $broker = $this->broker();
        $broker->failOperations = ['cancel_registration'];

        try {
            app(CapsuleRegistrationLifecycle::class)->cancel($creator, $capsule->registration_id);
            $this->fail('The simulated broker failure should escape.');
        } catch (RuntimeException) {
            $this->assertSame(CapsuleLifecycleStatus::CleanupPending, $capsule->fresh()->status);
        }

        $broker->failOperations = [];
        $result = app(ExpiredCapsuleRegistrationCleaner::class)->clean();

        $this->assertSame(['cleaned' => 1, 'failed' => 0], $result);
        $this->assertSame(CapsuleLifecycleStatus::Destroyed, $capsule->fresh()->status);
        $this->assertNotNull($capsule->fresh()->pending_expires_at);
        $this->assertCount(1, $broker->operations);
    }

    /** @return array{User, CreatorCapsule} */
    private function pending(?CarbonImmutable $createdAt = null): array
    {
        $createdAt ??= CarbonImmutable::now();
        $creator = User::factory()->create();
        $policy = [
            'type' => 'ctx-policy', 'version' => 1, 'combiner' => 'all',
            'requirements' => [
                ['predicate' => 'ctx.account.email-verified', 'equals' => true],
                ['predicate' => 'ctx.account.active', 'equals' => true],
                ['predicate' => 'ctx.viewer.device-registered', 'equals' => true],
                ['predicate' => 'ctx.consent.capsule-view-event', 'equals' => true],
            ],
        ];
        $registration = PendingCapsuleRegistration::fromValues(
            'registration_'.bin2hex(random_bytes(16)),
            'urn:uuid:'.Str::uuid(),
            1,
            'primary',
            'https://broker.example',
            (new CtxPolicyDigest)->calculate($policy),
            $policy,
        );
        $capsule = app(CapsuleRegistry::class)->createPending($creator, $registration, $createdAt);

        return [$creator, $capsule];
    }

    private function broker(): FakeBrokerContentKeyLifecycle
    {
        $broker = app(BrokerContentKeyLifecycle::class);
        $this->assertInstanceOf(FakeBrokerContentKeyLifecycle::class, $broker);

        return $broker;
    }
}
