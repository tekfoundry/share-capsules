<?php

namespace Tests\Feature\Account;

use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

final class ViewerDeviceManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_account_can_inspect_and_rename_its_viewer_devices(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $device = $this->device($user, 'Original name');

        $this->actingAs($user)
            ->get(route('account.devices.index'))
            ->assertOk()
            ->assertSee('Original name')
            ->assertSee('separate proof and agreement keys')
            ->assertSee('do not prove identity or personhood');

        $this->actingAs($user)
            ->patch(route('account.devices.update', $device), ['name' => 'Studio computer'])
            ->assertRedirect();

        $this->assertSame('Studio computer', $device->fresh()->name);
    }

    public function test_suspend_activate_and_revoke_require_recent_authentication(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $device = $this->device($user);

        $this->actingAs($user)
            ->post(route('account.devices.suspend', $device))
            ->assertRedirect(route('password.confirm'));

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->post(route('account.devices.suspend', $device))
            ->assertRedirect();
        $this->assertSame(ViewerDeviceStatus::Suspended, $device->fresh()->status);

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->post(route('account.devices.activate', $device))
            ->assertRedirect();
        $this->assertSame(ViewerDeviceStatus::Active, $device->fresh()->status);

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->delete(route('account.devices.destroy', $device))
            ->assertRedirect();
        $device->refresh();
        $this->assertSame(ViewerDeviceStatus::Revoked, $device->status);
        $this->assertNotNull($device->revoked_at);
    }

    public function test_revocation_is_permanent_and_cross_account_changes_are_forbidden(): void
    {
        $owner = User::factory()->create(['email_verified_at' => now()]);
        $other = User::factory()->create(['email_verified_at' => now()]);
        $device = $this->device($owner);

        $this->actingAs($other)
            ->patch(route('account.devices.update', $device), ['name' => 'Stolen'])
            ->assertForbidden();

        $device->update(['status' => ViewerDeviceStatus::Revoked, 'revoked_at' => now()]);

        $this->actingAs($owner)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->post(route('account.devices.activate', $device))
            ->assertSessionHasErrors('device');
        $this->assertSame(ViewerDeviceStatus::Revoked, $device->fresh()->status);
    }

    private function device(User $user, string $name = 'Personal browser'): ViewerDevice
    {
        return ViewerDevice::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'name' => $name,
            'proof_public_key' => $this->key(),
            'proof_jkt' => $this->key(),
            'agreement_public_key' => $this->key(),
            'agreement_jkt' => $this->key(),
            'status' => ViewerDeviceStatus::Active,
        ]);
    }

    private function key(): string
    {
        return sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }
}
