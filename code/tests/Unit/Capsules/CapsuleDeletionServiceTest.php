<?php

namespace Tests\Unit\Capsules;

use App\Broker\Lifecycle\BrokerContentKeyLifecycle;
use App\Capsules\Registry\CapsuleDeletionService;
use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Models\CreatorCapsule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\Support\FakeBrokerContentKeyLifecycle;
use Tests\TestCase;

final class CapsuleDeletionServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_destroys_the_broker_key_and_keeps_a_terminal_tombstone(): void
    {
        $creator = User::factory()->create(['email_verified_at' => now()]);
        $capsule = $this->capsule($creator, CapsuleLifecycleStatus::Revoked);
        $broker = $this->app->make(BrokerContentKeyLifecycle::class);
        $this->assertInstanceOf(FakeBrokerContentKeyLifecycle::class, $broker);

        app(CapsuleDeletionService::class)->delete($creator, $capsule->capsule_id, 1);

        $this->assertSame(CapsuleLifecycleStatus::Destroyed, $capsule->refresh()->status);
        $this->assertNotNull($capsule->destroyed_at);
        $this->assertSame([[
            'operation' => 'destroy_capsule',
            'creator_id' => (int) $creator->getKey(),
            'capsule_id' => $capsule->capsule_id,
            'capsule_revision' => 1,
        ]], $broker->operations);
    }

    public function test_a_broker_failure_leaves_the_capsule_fail_closed_and_retryable(): void
    {
        $creator = User::factory()->create(['email_verified_at' => now()]);
        $capsule = $this->capsule($creator, CapsuleLifecycleStatus::Active);
        $broker = $this->app->make(BrokerContentKeyLifecycle::class);
        $this->assertInstanceOf(FakeBrokerContentKeyLifecycle::class, $broker);
        $broker->failOperations[] = 'destroy_capsule';

        try {
            app(CapsuleDeletionService::class)->delete($creator, $capsule->capsule_id, 1);
            $this->fail('The broker failure should be preserved.');
        } catch (RuntimeException) {
            $this->assertSame(CapsuleLifecycleStatus::CleanupPending, $capsule->refresh()->status);
            $this->assertFalse($capsule->status->permitsRelease());
            $this->assertNotNull($capsule->cleanup_requested_at);
        }
    }

    private function capsule(User $creator, CapsuleLifecycleStatus $status): CreatorCapsule
    {
        return CreatorCapsule::query()->create([
            'user_id' => $creator->getKey(),
            'registration_id' => 'registration_'.str_repeat('a', 32),
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'payload_id' => 'primary',
            'broker' => 'https://broker.example.test',
            'release_handle' => str_repeat('r', 43),
            'policy_sha256' => str_repeat('p', 43),
            'policy' => [],
            'status' => $status,
            'pending_expires_at' => now(),
            'finalized_at' => now(),
            'revoked_at' => $status === CapsuleLifecycleStatus::Revoked ? now() : null,
        ]);
    }
}
