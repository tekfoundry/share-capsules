<?php

namespace Tests\Feature\Studio;

use App\Broker\Lifecycle\BrokerContentKeyLifecycle;
use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Models\CreatorCapsule;
use App\Models\CtxCapsuleReleaseCounter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\FakeBrokerContentKeyLifecycle;
use Tests\TestCase;

final class CapsuleInventoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_creator_sees_only_successfully_registered_owned_capsules(): void
    {
        $owner = User::factory()->create(['email_verified_at' => now()]);
        $other = User::factory()->create(['email_verified_at' => now()]);
        $capsuleId = 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703';
        $this->grant($owner, $capsuleId, true);
        $this->grant($other, 'urn:uuid:028f61fe-729b-4f87-8865-2e1f9d8db704', true);
        $this->grant($owner, 'urn:uuid:038f61fe-729b-4f87-8865-2e1f9d8db705', false);
        CtxCapsuleReleaseCounter::query()->create([
            'capsule_id' => $capsuleId,
            'capsule_revision' => 1,
            'committed_releases' => 7,
        ]);

        $this->actingAs($owner)->get(route('studio.capsules.index'))
            ->assertOk()
            ->assertSee('New Capsule')
            ->assertSee(route('studio.capsules.create'), false)
            ->assertSee($capsuleId)
            ->assertSee('Protected landscape')
            ->assertSee('Image')
            ->assertSee('PNG')
            ->assertSee('Edit the name shown in your account')
            ->assertDontSee('Rename for your account')
            ->assertSee('Delete Capsule')
            ->assertSee(route('studio.capsules.destroy', [$capsuleId, 1]), false)
            ->assertSee('data-confirm-title="Permanently revoke access?"', false)
            ->assertSee('data-confirm-title="Delete this Capsule?"', false)
            ->assertSee('7')
            ->assertSee('Policy identifier')
            ->assertSee('Account deletion impact')
            ->assertDontSee('028f61fe')
            ->assertDontSee('038f61fe');
    }

    public function test_a_creator_can_set_a_private_management_label_without_changing_the_signed_title(): void
    {
        $owner = User::factory()->create(['email_verified_at' => now()]);
        $other = User::factory()->create(['email_verified_at' => now()]);
        $capsuleId = 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703';
        $this->grant($owner, $capsuleId, true);

        $this->actingAs($owner)->patch(route('studio.capsules.label', [$capsuleId, 1]), [
            'management_label' => 'Homepage hero',
        ])->assertRedirect()->assertSessionHas('status', 'Capsule label updated.');

        $capsule = CreatorCapsule::query()->where('capsule_id', $capsuleId)->firstOrFail();
        $this->assertSame('Homepage hero', $capsule->management_label);
        $this->assertSame('Protected landscape', $capsule->title);
        $this->actingAs($owner)->get(route('studio.capsules.index'))
            ->assertSee('Homepage hero');

        $this->actingAs($other)->patch(route('studio.capsules.label', [$capsuleId, 1]), [
            'management_label' => 'Not mine',
        ])->assertNotFound();
    }

    public function test_dashboard_links_to_capsule_inventory(): void
    {
        $owner = User::factory()->create(['email_verified_at' => now()]);

        $this->actingAs($owner)->get(route('dashboard'))
            ->assertOk()
            ->assertSee('New Capsule')
            ->assertSee('Account navigation')
            ->assertSee('data-confirmation-dialog', false)
            ->assertSee('Sign out')
            ->assertSee(route('studio.capsules.index'), false)
            ->assertSee(route('account.security'), false)
            ->assertDontSee('Quick actions');
    }

    public function test_revocation_requires_recent_authentication_and_ownership(): void
    {
        $owner = User::factory()->create(['email_verified_at' => now()]);
        $other = User::factory()->create(['email_verified_at' => now()]);
        $capsuleId = 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703';
        $this->grant($owner, $capsuleId, true);

        $this->actingAs($owner)->post(route('studio.capsules.revoke'), [
            'capsule_id' => $capsuleId,
            'capsule_revision' => 1,
        ])->assertRedirect(route('password.confirm'));

        $this->actingAs($other)->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->post(route('studio.capsules.revoke'), [
                'capsule_id' => $capsuleId,
                'capsule_revision' => 1,
            ])->assertNotFound();
    }

    public function test_deletion_requires_recent_authentication_and_destroys_only_an_owned_capsule(): void
    {
        $owner = User::factory()->create(['email_verified_at' => now()]);
        $other = User::factory()->create(['email_verified_at' => now()]);
        $capsuleId = 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703';
        $this->grant($owner, $capsuleId, true);

        $this->actingAs($owner)->delete(route('studio.capsules.destroy', [$capsuleId, 1]))
            ->assertRedirect(route('password.confirm'));

        $this->actingAs($other)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->delete(route('studio.capsules.destroy', [$capsuleId, 1]))
            ->assertNotFound();

        $this->actingAs($owner)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->delete(route('studio.capsules.destroy', [$capsuleId, 1]))
            ->assertRedirect(route('studio.capsules.index'))
            ->assertSessionHas('status', 'Capsule deleted. Its content key has been permanently destroyed.');

        $capsule = CreatorCapsule::query()->where('capsule_id', $capsuleId)->sole();
        $this->assertSame(CapsuleLifecycleStatus::Destroyed, $capsule->status);
        $this->assertNotNull($capsule->destroyed_at);
        $broker = $this->app->make(BrokerContentKeyLifecycle::class);
        $this->assertInstanceOf(FakeBrokerContentKeyLifecycle::class, $broker);
        $this->assertSame('destroy_capsule', $broker->operations[0]['operation']);

        $this->actingAs($owner)->get(route('studio.capsules.index'))
            ->assertDontSee($capsuleId);
    }

    public function test_metrics_are_creator_scoped_and_explain_privacy_suppression(): void
    {
        config()->set('sharecapsules.capsules.per_account_pressure_enabled', true);
        $owner = User::factory()->create(['email_verified_at' => now()]);
        $other = User::factory()->create(['email_verified_at' => now()]);
        $capsuleId = 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703';
        $this->grant($owner, $capsuleId, true);

        $this->actingAs($owner)->get(route('studio.capsules.metrics', [$capsuleId, 1]))
            ->assertOk()->assertSee('Completed openings')->assertSee('Safe denial groups')
            ->assertSee('Unavailable while we complete the privacy review')
            ->assertSee('User identifiers and individual histories are never included');
        $this->actingAs($other)->get(route('studio.capsules.metrics', [$capsuleId, 1]))
            ->assertNotFound();
    }

    private function grant(User $user, string $capsuleId, bool $redeemed): void
    {
        CreatorCapsule::query()->create([
            'user_id' => $user->getKey(),
            'registration_id' => 'registration_'.bin2hex(random_bytes(16)),
            'capsule_id' => $capsuleId, 'capsule_revision' => 1, 'payload_id' => 'primary',
            'title' => 'Protected landscape',
            'content_profile_id' => 'ctx.content.static-image',
            'content_profile_version' => '1.0',
            'media_type' => 'image/png',
            'broker' => 'https://broker.example.test',
            'release_handle' => $redeemed ? sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING) : null,
            'policy_sha256' => sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING),
            'policy' => [],
            'status' => $redeemed ? CapsuleLifecycleStatus::Active : CapsuleLifecycleStatus::Pending,
            'pending_expires_at' => now()->addMinutes(15),
            'finalized_at' => $redeemed ? now() : null,
        ]);
    }
}
