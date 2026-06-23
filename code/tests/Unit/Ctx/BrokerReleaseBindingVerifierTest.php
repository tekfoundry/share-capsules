<?php

namespace Tests\Unit\Ctx;

use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Ctx\Tickets\BrokerReleaseBindingVerifier;
use App\Ctx\Tickets\CtxTicketBindings;
use App\Models\CreatorCapsule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class BrokerReleaseBindingVerifierTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_an_exact_active_registry_binding_is_checked_with_the_broker(): void
    {
        config()->set('sharecapsules.broker.internal_url', 'https://broker-internal.example.test');
        Http::fake(['*/internal/release-bindings/validate' => Http::response(['valid' => true])]);
        $bindings = $this->bindings();
        $capsule = $this->capsule($bindings, CapsuleLifecycleStatus::Pending);
        $verifier = app(BrokerReleaseBindingVerifier::class);

        $this->assertFalse($verifier->valid($bindings));
        Http::assertNothingSent();

        $capsule->forceFill(['status' => CapsuleLifecycleStatus::Active])->save();
        $this->assertTrue($verifier->valid($bindings));
        Http::assertSentCount(1);
        Http::assertSent(fn ($request): bool => str_starts_with(
            $request->url(),
            'https://broker-internal.example.test/internal/release-bindings/validate',
        ));

        $capsule->forceFill(['status' => CapsuleLifecycleStatus::Revoked])->save();
        $this->assertFalse($verifier->valid($bindings));
        Http::assertSentCount(1);
    }

    private function bindings(): CtxTicketBindings
    {
        $digest = sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);

        return new CtxTicketBindings(
            broker: 'https://broker.example.test',
            capsuleId: 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            capsuleRevision: 1,
            policySha256: $digest,
            payloadId: 'primary',
            releaseHandle: sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING),
            proofJkt: $digest,
            agreementJkt: $digest,
        );
    }

    private function capsule(CtxTicketBindings $bindings, CapsuleLifecycleStatus $status): CreatorCapsule
    {
        return CreatorCapsule::query()->create([
            'user_id' => User::factory()->create()->getKey(),
            'registration_id' => 'registration_'.bin2hex(random_bytes(16)),
            'capsule_id' => $bindings->capsuleId,
            'capsule_revision' => $bindings->capsuleRevision,
            'payload_id' => $bindings->payloadId,
            'broker' => $bindings->broker,
            'release_handle' => $bindings->releaseHandle,
            'policy_sha256' => $bindings->policySha256,
            'policy' => [],
            'status' => $status,
            'pending_expires_at' => now()->addMinutes(15),
            'finalized_at' => $status === CapsuleLifecycleStatus::Active ? now() : null,
        ]);
    }
}
