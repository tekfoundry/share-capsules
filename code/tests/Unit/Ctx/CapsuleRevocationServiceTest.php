<?php

namespace Tests\Unit\Ctx;

use App\Broker\Lifecycle\BrokerContentKeyLifecycle;
use App\Broker\Lifecycle\CapsuleRevocationService;
use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Models\CreatorCapsule;
use App\Models\CtxCapsuleMetricProjection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\FakeBrokerContentKeyLifecycle;
use Tests\TestCase;

final class CapsuleRevocationServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_revocation_is_creator_scoped_and_projects_one_idempotent_event(): void
    {
        $creator = User::factory()->create(['email_verified_at' => now()]);
        $broker = $this->app->make(BrokerContentKeyLifecycle::class);
        $this->assertInstanceOf(FakeBrokerContentKeyLifecycle::class, $broker);
        $capsuleId = 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703';
        $capsule = CreatorCapsule::query()->create([
            'user_id' => $creator->getKey(),
            'registration_id' => 'registration_'.str_repeat('a', 32),
            'capsule_id' => $capsuleId,
            'capsule_revision' => 2,
            'payload_id' => 'primary',
            'broker' => 'https://broker.example.test',
            'release_handle' => str_repeat('r', 43),
            'policy_sha256' => str_repeat('p', 43),
            'policy' => [],
            'status' => CapsuleLifecycleStatus::Active,
            'pending_expires_at' => now(),
            'finalized_at' => now(),
        ]);
        $service = app(CapsuleRevocationService::class);

        $service->revoke($creator, $capsuleId, 2);
        $service->revoke($creator, $capsuleId, 2);

        $this->assertSame([
            [
                'operation' => 'revoke_capsule',
                'creator_id' => (int) $creator->getKey(),
                'capsule_id' => $capsuleId,
                'capsule_revision' => 2,
            ],
        ], $broker->operations);
        $this->assertSame(CapsuleLifecycleStatus::Revoked, $capsule->refresh()->status);
        $projection = CtxCapsuleMetricProjection::query()->sole();
        $this->assertSame(1, $projection->capsule_revoked);
        $this->assertSame(0, $projection->redemption_committed);
    }
}
