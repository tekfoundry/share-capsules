<?php

namespace Tests\Unit\Ctx;

use App\Broker\Lifecycle\BrokerContentKeyLifecycle;
use App\Broker\Lifecycle\CapsuleRevocationService;
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
            [
                'operation' => 'revoke_capsule',
                'creator_id' => (int) $creator->getKey(),
                'capsule_id' => $capsuleId,
                'capsule_revision' => 2,
            ],
        ], $broker->operations);
        $projection = CtxCapsuleMetricProjection::query()->sole();
        $this->assertSame(1, $projection->capsule_revoked);
        $this->assertSame(0, $projection->redemption_committed);
    }
}
