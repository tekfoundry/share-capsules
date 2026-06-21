<?php

namespace Tests\Feature\Account;

use App\Account\Sessions\AccountSessionRepository;
use App\Account\Sessions\AccountSessionService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class SessionManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_account_can_inspect_its_sessions(): void
    {
        $user = User::factory()->create();
        $this->createSession($user, 'current-session', '192.0.2.10', $this->chromeOnMacUserAgent());
        $this->createSession($user, 'other-session', '198.51.100.8', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/141.0');

        $sessions = app(AccountSessionRepository::class)->forUser($user, 'current-session');

        $this->assertCount(2, $sessions);
        $this->assertTrue($sessions->firstWhere('id', 'current-session')->isCurrent);
        $this->assertFalse($sessions->firstWhere('id', 'other-session')->isCurrent);

        $this->actingAs($user)
            ->get(route('account.security'))
            ->assertOk()
            ->assertSee('Active browser sessions')
            ->assertSee('Chrome on macOS')
            ->assertSee('Firefox on Windows');
    }

    public function test_an_account_can_revoke_one_of_its_other_sessions(): void
    {
        $user = User::factory()->create();
        $originalRememberToken = $user->remember_token;
        $this->createSession($user, 'othersession');

        $this->actingAs($user)
            ->delete(route('account.sessions.destroy', 'othersession'))
            ->assertSessionHas('status', 'Session revoked.');

        $this->assertDatabaseMissing('sessions', ['id' => 'othersession']);
        $this->assertNotSame($originalRememberToken, $user->fresh()->remember_token);
    }

    public function test_an_account_cannot_revoke_another_accounts_session(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $this->createSession($otherUser, 'otheraccountsession');

        $this->actingAs($user)
            ->delete(route('account.sessions.destroy', 'otheraccountsession'))
            ->assertSessionHasErrors('session');

        $this->assertDatabaseHas('sessions', ['id' => 'otheraccountsession']);
    }

    public function test_the_repository_refuses_to_revoke_the_current_session(): void
    {
        $user = User::factory()->create();
        $this->createSession($user, 'current-session');

        $revoked = app(AccountSessionRepository::class)->revoke(
            $user,
            'current-session',
            'current-session',
        );

        $this->assertFalse($revoked);
        $this->assertDatabaseHas('sessions', ['id' => 'current-session']);
    }

    public function test_the_session_service_preserves_the_current_session_when_revoking_others(): void
    {
        $user = User::factory()->create(['password' => 'Correct-Horse-42!']);
        $this->createSession($user, 'current-session');
        $this->createSession($user, 'other-session-one');
        $this->createSession($user, 'other-session-two');

        $revoked = app(AccountSessionService::class)->revokeOthers($user, 'current-session');

        $this->assertSame(2, $revoked);
        $this->assertDatabaseHas('sessions', ['id' => 'current-session']);
        $this->assertDatabaseMissing('sessions', ['id' => 'other-session-one']);
        $this->assertDatabaseMissing('sessions', ['id' => 'other-session-two']);
    }

    public function test_an_account_can_revoke_every_other_session_with_its_password(): void
    {
        $user = User::factory()->create(['password' => 'Correct-Horse-42!']);
        $this->createSession($user, 'othersessionone');
        $this->createSession($user, 'othersessiontwo');

        $this->actingAs($user)
            ->delete(route('account.sessions.destroy-others'), ['password' => 'Correct-Horse-42!'])
            ->assertSessionHas('status', '2 other sessions were revoked.');

        $this->assertDatabaseMissing('sessions', ['id' => 'othersessionone']);
        $this->assertDatabaseMissing('sessions', ['id' => 'othersessiontwo']);
    }

    public function test_the_revoke_others_endpoint_requires_the_current_password(): void
    {
        $user = User::factory()->create(['password' => 'Correct-Horse-42!']);
        $this->createSession($user, 'other-session');

        $this->actingAs($user)
            ->delete(route('account.sessions.destroy-others'), ['password' => 'wrong-password'])
            ->assertSessionHasErrors('password');

        $this->assertDatabaseHas('sessions', ['id' => 'other-session']);
    }

    private function createSession(
        User $user,
        string $id,
        string $ipAddress = '192.0.2.10',
        string $userAgent = 'Mozilla/5.0',
    ): void {
        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $user->getKey(),
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'payload' => '',
            'last_activity' => now()->timestamp,
        ]);
    }

    private function chromeOnMacUserAgent(): string
    {
        return 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Chrome/140.0 Safari/537.36';
    }
}
