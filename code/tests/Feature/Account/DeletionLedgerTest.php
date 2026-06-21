<?php

namespace Tests\Feature\Account;

use App\Account\Deletion\AccountDeletionService;
use App\Models\AccountDeletionLedgerEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

final class DeletionLedgerTest extends TestCase
{
    use RefreshDatabase;

    public function test_permanent_deletion_records_only_the_minimum_durable_obligation(): void
    {
        $this->freezeTime();
        $user = $this->closedUser();

        app(AccountDeletionService::class)->deleteAccount($user->getKey());

        $entry = AccountDeletionLedgerEntry::query()->sole();
        $this->assertSame($user->getKey(), $entry->account_id);
        $this->assertTrue($user->deletion_due_at->equalTo($entry->deletion_due_at));
        $this->assertEqualsCanonicalizing([
            'id', 'account_id', 'deletion_due_at', 'recorded_at', 'retain_until',
        ], Schema::connection(config('accounts.deletion_ledger.connection'))
            ->getColumnListing('account_deletion_ledger'));
    }

    public function test_replay_idempotently_erases_an_account_resurrected_from_backup(): void
    {
        $original = $this->closedUser();
        $accountId = $original->getKey();
        app(AccountDeletionService::class)->deleteAccount($accountId);
        $this->restoreUser($accountId, $original->email);
        $restoreId = (string) Str::uuid();

        $this->artisan('accounts:reapply-deletions', ['--restore-id' => $restoreId])
            ->expectsOutputToContain('removed 1 restored account(s)')
            ->assertSuccessful();
        $this->artisan('accounts:reapply-deletions', ['--restore-id' => $restoreId])
            ->expectsOutputToContain('removed 0 restored account(s)')
            ->assertSuccessful();

        $this->assertDatabaseMissing('users', ['id' => $accountId]);
        $this->assertDatabaseHas('deletion_restore_checkpoints', ['restore_id' => $restoreId]);
    }

    public function test_a_restored_deployment_fails_closed_until_replay_completes(): void
    {
        $user = $this->closedUser();
        $accountId = $user->getKey();
        app(AccountDeletionService::class)->deleteAccount($accountId);
        $this->restoreUser($accountId, $user->email);
        $restoreId = (string) Str::uuid();
        config()->set('accounts.deletion_ledger.replay_required', true);
        config()->set('accounts.deletion_ledger.restore_id', $restoreId);

        $this->getJson('/')->assertServiceUnavailable()
            ->assertJsonPath('error', 'restore_replay_required');
        $this->getJson('/up')->assertServiceUnavailable()
            ->assertJsonPath('services.deletion_replay.status', 'unhealthy');

        $this->artisan('accounts:reapply-deletions')->assertSuccessful();

        $this->get('/')->assertOk();
        $this->getJson('/up')->assertOk()
            ->assertJsonPath('services.deletion_replay.status', 'healthy');
        $this->assertDatabaseMissing('users', ['id' => $accountId]);
    }

    public function test_replay_requires_a_unique_restore_uuid(): void
    {
        $this->artisan('accounts:reapply-deletions', ['--restore-id' => 'not-a-uuid'])
            ->expectsOutputToContain('A valid unique restore UUID is required.')
            ->assertExitCode(2);

        $this->assertDatabaseCount('deletion_restore_checkpoints', 0);
    }

    public function test_ledger_entries_expire_with_the_thirty_day_backup_window(): void
    {
        $this->freezeTime();
        $user = $this->closedUser();
        app(AccountDeletionService::class)->deleteAccount($user->getKey());
        $this->travel(30)->days();

        $this->artisan('model:prune', ['--model' => AccountDeletionLedgerEntry::class])
            ->assertSuccessful();

        $this->assertDatabaseCount('account_deletion_ledger', 0);
    }

    private function closedUser(): User
    {
        return User::factory()->create([
            'email' => 'deleted@example.test',
            'email_verified_at' => now(),
            'closed_at' => now()->subDays(30),
            'deletion_due_at' => now()->subSecond(),
            'closure_recovery_token_hash' => hash('sha256', Str::random(64)),
        ]);
    }

    private function restoreUser(int $accountId, string $email): User
    {
        return User::query()->forceCreate([
            'id' => $accountId,
            'email' => $email,
            'password' => 'irrelevant-restored-hash',
            'email_verified_at' => now(),
        ]);
    }
}
