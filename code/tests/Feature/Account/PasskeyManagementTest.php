<?php

namespace Tests\Feature\Account;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passkeys\Passkey;
use Tests\TestCase;

final class PasskeyManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_passkey_management_requires_recent_authentication(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $this->actingAs($user)
            ->get(route('account.passkeys'))
            ->assertRedirect(route('password.confirm'));
    }

    public function test_a_verified_account_can_inspect_its_passkeys_after_confirming(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $passkey = $user->passkeys()->create([
            'name' => 'Personal MacBook',
            'credential_id' => 'credential-one',
            'credential' => ['aaguid' => '00000000-0000-0000-0000-000000000000'],
        ]);
        $passkey->forceFill(['last_used_at' => now()->subDay()])->save();

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->get(route('account.passkeys'))
            ->assertOk()
            ->assertSee('Personal MacBook')
            ->assertSee('Last used')
            ->assertSee('do not prove identity, personhood, or trustworthiness');
    }

    public function test_an_account_can_revoke_its_own_passkey(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $passkey = $user->passkeys()->create([
            'name' => 'Security key',
            'credential_id' => 'credential-two',
            'credential' => [],
        ]);

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->delete(route('passkey.destroy', $passkey))
            ->assertRedirect();

        $this->assertDatabaseMissing('passkeys', ['id' => $passkey->getKey()]);
    }

    public function test_an_account_cannot_revoke_another_accounts_passkey(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $otherPasskey = User::factory()->create()->passkeys()->create([
            'name' => 'Someone else’s key',
            'credential_id' => 'credential-three',
            'credential' => [],
        ]);

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->delete(route('passkey.destroy', $otherPasskey))
            ->assertForbidden();

        $this->assertDatabaseHas('passkeys', ['id' => $otherPasskey->getKey()]);
    }

    public function test_login_offers_passkeys_without_removing_password_recovery(): void
    {
        $this->get(route('login'))
            ->assertOk()
            ->assertSee('Sign in with a passkey')
            ->assertSee('autocomplete="email webauthn"', false)
            ->assertSee('Forgot password?');
    }

    public function test_user_model_uses_the_official_passkey_relationship(): void
    {
        $this->assertInstanceOf(Passkey::class, (new User)->passkeys()->getModel());
    }
}
