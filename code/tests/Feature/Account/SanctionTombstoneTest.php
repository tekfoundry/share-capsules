<?php

namespace Tests\Feature\Account;

use App\Account\Deletion\AccountDeletionService;
use App\Account\Sanctions\AccountSanctionService;
use App\Account\Sanctions\SanctionCategory;
use App\Account\Sanctions\SanctionEmailHasher;
use App\Models\SanctionTombstone;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use InvalidArgumentException;
use Tests\TestCase;

final class SanctionTombstoneTest extends TestCase
{
    use RefreshDatabase;

    public function test_ordinary_deletion_leaves_no_account_tombstone(): void
    {
        $user = $this->closedUser('ordinary@example.test');

        $this->assertTrue(app(AccountDeletionService::class)->deleteAccount($user->getKey()));

        $this->assertModelMissing($user);
        $this->assertDatabaseCount('sanction_tombstones', 0);
    }

    public function test_only_an_active_sanction_creates_a_restricted_tombstone(): void
    {
        $this->freezeTime();
        $user = $this->closedUser('Sanctioned@Example.TEST');
        $sanction = app(AccountSanctionService::class)->impose(
            $user,
            SanctionCategory::AutomationAbuse,
            now()->addDays(30),
            'appeal-active',
        );

        $this->assertTrue(app(AccountDeletionService::class)->deleteAccount($user->getKey()));

        $tombstone = SanctionTombstone::query()->sole();
        $this->assertModelMissing($user);
        $this->assertSame(
            app(SanctionEmailHasher::class)->hash('  sanctioned@example.test '),
            $tombstone->getRawOriginal('email_hmac'),
        );
        $this->assertSame(SanctionCategory::AutomationAbuse, $tombstone->category);
        $this->assertTrue($sanction->imposed_at->equalTo($tombstone->imposed_at));
        $this->assertTrue($sanction->expires_at->equalTo($tombstone->sanction_expires_at));
        $this->assertTrue($sanction->expires_at->equalTo($tombstone->retain_until));
        $this->assertSame('appeal-active', $tombstone->appeal_reference);
        $this->assertEqualsCanonicalizing([
            'id',
            'email_hmac',
            'category',
            'imposed_at',
            'sanction_expires_at',
            'appeal_reference',
            'retain_until',
            'created_at',
        ], Schema::getColumnListing('sanction_tombstones'));
    }

    public function test_reversed_and_expired_sanctions_leave_no_tombstone(): void
    {
        $this->freezeTime();
        $reversed = $this->closedUser('reversed@example.test');
        $expired = $this->closedUser('expired@example.test');
        $service = app(AccountSanctionService::class);
        $reversedSanction = $service->impose(
            $reversed,
            SanctionCategory::AccountAbuse,
            now()->addDay(),
            'appeal-reversed',
        );
        $reversedSanction->update(['reversed_at' => now()]);
        $expiredSanction = $service->impose(
            $expired,
            SanctionCategory::SecurityAbuse,
            now()->addSecond(),
            'appeal-expired',
        );
        $this->travel(2)->seconds();

        app(AccountDeletionService::class)->deleteAccount($reversed->getKey());
        app(AccountDeletionService::class)->deleteAccount($expired->getKey());

        $this->assertDatabaseCount('sanction_tombstones', 0);
    }

    public function test_retention_ends_at_the_earlier_of_sanction_expiry_and_ninety_days(): void
    {
        $this->freezeTime();
        $short = $this->closedUser('short@example.test');
        $long = $this->closedUser('long@example.test');
        $service = app(AccountSanctionService::class);
        $service->impose($short, SanctionCategory::AccountAbuse, now()->addDays(10), 'short');
        $service->impose($long, SanctionCategory::AccountAbuse, now()->addDays(120), 'long');

        app(AccountDeletionService::class)->deleteAccount($short->getKey());
        app(AccountDeletionService::class)->deleteAccount($long->getKey());

        $this->assertSame(
            now()->addDays(10)->timestamp,
            SanctionTombstone::query()->where('appeal_reference', 'short')->sole()
                ->retain_until->timestamp,
        );
        $this->assertSame(
            now()->addDays(90)->timestamp,
            SanctionTombstone::query()->where('appeal_reference', 'long')->sole()
                ->retain_until->timestamp,
        );
    }

    public function test_same_email_signup_is_blocked_only_while_the_tombstone_is_active(): void
    {
        $this->freezeTime();
        $user = $this->closedUser('restricted@example.test');
        app(AccountSanctionService::class)->impose(
            $user,
            SanctionCategory::AutomationAbuse,
            now()->addDays(10),
            'appeal-signup',
        );
        app(AccountDeletionService::class)->deleteAccount($user->getKey());

        $this->register(' RESTRICTED@example.test ')->assertSessionHasErrors('email');
        $this->register('different@example.test')->assertRedirect(route('verification.notice'));

        auth()->logout();
        $this->assertSame(
            1,
            app(AccountSanctionService::class)->reverseByAppealReference('appeal-signup'),
        );
        $this->register('restricted@example.test')->assertRedirect(route('verification.notice'));
        $this->assertDatabaseMissing('sanction_tombstones', ['appeal_reference' => 'appeal-signup']);
    }

    public function test_expired_tombstones_are_pruned_and_no_longer_block_signup(): void
    {
        $this->freezeTime();
        $user = $this->closedUser('pruned@example.test');
        app(AccountSanctionService::class)->impose(
            $user,
            SanctionCategory::AutomationAbuse,
            now()->addDay(),
            'appeal-pruned',
        );
        app(AccountDeletionService::class)->deleteAccount($user->getKey());
        $this->travel(1)->day();

        $this->artisan('model:prune', ['--model' => SanctionTombstone::class])
            ->assertSuccessful();

        $this->assertDatabaseCount('sanction_tombstones', 0);
        $this->register('pruned@example.test')->assertRedirect(route('verification.notice'));
    }

    public function test_invalid_hmac_configuration_aborts_and_rolls_back_deletion(): void
    {
        config()->set('accounts.sanctions.email_hmac_key', 'too-short');
        $user = $this->closedUser('rollback@example.test');
        app(AccountSanctionService::class)->impose(
            $user,
            SanctionCategory::SecurityAbuse,
            now()->addDay(),
        );

        $this->expectException(InvalidArgumentException::class);

        try {
            app(AccountDeletionService::class)->deleteAccount($user->getKey());
        } finally {
            $this->assertModelExists($user);
            $this->assertDatabaseCount('sanction_tombstones', 0);
        }
    }

    public function test_a_sanction_requires_a_future_expiry(): void
    {
        $this->expectException(InvalidArgumentException::class);

        app(AccountSanctionService::class)->impose(
            User::factory()->create(),
            SanctionCategory::AccountAbuse,
            now(),
        );
    }

    private function closedUser(string $email): User
    {
        return User::factory()->create([
            'email' => $email,
            'email_verified_at' => now(),
            'closed_at' => now()->subDays(30),
            'deletion_due_at' => now()->subSecond(),
            'closure_recovery_token_hash' => hash('sha256', Str::random(64)),
        ]);
    }

    private function register(string $email): TestResponse
    {
        return $this->post(route('register.store'), [
            'email' => $email,
            'password' => 'Correct-Horse-42!',
            'password_confirmation' => 'Correct-Horse-42!',
            'terms' => '1',
        ]);
    }
}
