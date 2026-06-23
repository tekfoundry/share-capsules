<?php

namespace Tests\Feature\Account;

use App\Account\Deletion\AccountDeletionParticipant;
use App\Account\Deletion\AccountDeletionService;
use App\Account\Deletion\AccountTrustProfileRepository;
use App\Broker\Lifecycle\BrokerContentKeyLifecycle;
use App\Broker\Lifecycle\BrokerContentKeyLifecycleFailed;
use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Models\CreatorCapsule;
use App\Models\User;
use App\Models\ViewerDevice;
use App\OAuth\ExtensionOAuthClientConfiguration;
use App\OAuth\ExtensionOAuthClientProvisioner;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Passport\AuthCode;
use Laravel\Passport\RefreshToken;
use Laravel\Passport\Token;
use RuntimeException;
use Tests\Support\FakeBrokerContentKeyLifecycle;
use Tests\TestCase;

final class PermanentAccountDeletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_scheduled_command_permanently_removes_an_expired_account_and_linked_state(): void
    {
        $this->freezeTime();
        $broker = $this->app->make(BrokerContentKeyLifecycle::class);
        $this->assertInstanceOf(FakeBrokerContentKeyLifecycle::class, $broker);
        $profiles = new RecordingTrustProfileRepository;
        $this->app->instance(AccountTrustProfileRepository::class, $profiles);
        $user = $this->closedUser(now()->subSecond());
        $profiles->profiles[$user->getKey()] = ['viewer_score' => 42];
        $device = $this->device($user);
        $capsule = $this->capsule($user);
        [$accessToken, $refreshToken, $authCode] = $this->oauthCredentials($user, $device);
        DB::table('sessions')->insert([
            'id' => 'expired-account-session',
            'user_id' => $user->getKey(),
            'payload' => '',
            'last_activity' => now()->timestamp,
        ]);
        DB::table('password_reset_tokens')->insert([
            'email' => $user->email,
            'token' => 'hashed-reset-token',
            'created_at' => now(),
        ]);
        DB::table('passkeys')->insert([
            'user_id' => $user->getKey(),
            'name' => 'Security key',
            'credential_id' => 'credential-'.$user->getKey(),
            'credential' => json_encode(['id' => 'credential'], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->artisan('accounts:delete-expired')
            ->expectsOutputToContain('Permanently deleted 1 expired account(s).')
            ->assertSuccessful();

        $this->assertModelMissing($user);
        $this->assertModelMissing($device);
        $this->assertModelMissing($capsule);
        $this->assertModelMissing($accessToken);
        $this->assertModelMissing($refreshToken);
        $this->assertModelMissing($authCode);
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->getKey()]);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
        $this->assertDatabaseMissing('passkeys', ['user_id' => $user->getKey()]);
        $this->assertArrayNotHasKey($user->getKey(), $profiles->profiles);
        $this->assertContains([
            'operation' => 'destroy_creator',
            'creator_id' => (int) $user->getKey(),
        ], $broker->operations);
    }

    public function test_active_and_recoverable_accounts_are_never_deleted(): void
    {
        $active = User::factory()->create(['email_verified_at' => now()]);
        $recoverable = $this->closedUser(now()->addSecond());

        $result = app(AccountDeletionService::class)->deleteDue(100);

        $this->assertSame(0, $result->deleted);
        $this->assertSame([], $result->failedAccountIds);
        $this->assertModelExists($active);
        $this->assertModelExists($recoverable);
    }

    public function test_the_exact_recovery_deadline_is_an_irreversible_deletion_boundary(): void
    {
        $this->freezeTime();
        $expired = $this->closedUser(now());
        $later = $this->closedUser(now()->addSecond(), 'later@example.test');

        $result = app(AccountDeletionService::class)->deleteDue(1);

        $this->assertSame(1, $result->deleted);
        $this->assertModelMissing($expired);
        $this->assertModelExists($later);
    }

    public function test_a_replacement_account_inherits_no_identifier_device_or_trust_profile(): void
    {
        $profiles = new RecordingTrustProfileRepository;
        $this->app->instance(AccountTrustProfileRepository::class, $profiles);
        $oldAccount = $this->closedUser(now()->subDay(), 'replace@example.test');
        $oldAccountId = $oldAccount->getKey();
        $oldDevice = $this->device($oldAccount);
        $profiles->profiles[$oldAccountId] = ['giver_score' => 99];

        $this->assertTrue(app(AccountDeletionService::class)->deleteAccount($oldAccountId));
        $replacement = User::factory()->create([
            'email' => 'replace@example.test',
            'email_verified_at' => now(),
        ]);

        $this->assertNotSame($oldAccountId, $replacement->getKey());
        $this->assertModelMissing($oldDevice);
        $this->assertCount(0, $replacement->viewerDevices);
        $this->assertArrayNotHasKey($oldAccountId, $profiles->profiles);
        $this->assertArrayNotHasKey($replacement->getKey(), $profiles->profiles);
    }

    public function test_a_failed_deletion_participant_rolls_back_and_is_reported_for_retry(): void
    {
        $user = $this->closedUser(now()->subDay());
        $device = $this->device($user);
        $capsule = $this->capsule($user);
        $this->app->when(AccountDeletionService::class)
            ->needs('$participants')
            ->give([new FailingDeletionParticipant]);

        $this->artisan('accounts:delete-expired')
            ->expectsOutputToContain('1 account deletion(s) failed and will be retried.')
            ->assertFailed();

        $this->assertModelExists($user);
        $this->assertModelExists($device);
        $this->assertSame(CapsuleLifecycleStatus::Active, $capsule->fresh()->status);
    }

    public function test_broker_destruction_must_succeed_before_personal_data_is_erased(): void
    {
        $user = $this->closedUser(now()->subDay());
        $device = $this->device($user);
        $capsule = $this->capsule($user);
        $this->mock(BrokerContentKeyLifecycle::class)
            ->shouldReceive('destroyCreator')
            ->once()
            ->with((int) $user->getKey())
            ->andThrow(new BrokerContentKeyLifecycleFailed('Broker unavailable.'));

        $result = app(AccountDeletionService::class)->deleteDue(100);

        $this->assertSame(0, $result->deleted);
        $this->assertSame([(int) $user->getKey()], $result->failedAccountIds);
        $this->assertModelExists($user);
        $this->assertModelExists($device);
        $this->assertSame(CapsuleLifecycleStatus::Active, $capsule->fresh()->status);
    }

    public function test_the_command_rejects_an_unsafe_batch_limit(): void
    {
        $this->artisan('accounts:delete-expired', ['--limit' => '0'])
            ->expectsOutputToContain('The limit must be an integer between 1 and 1000.')
            ->assertExitCode(2);
    }

    public function test_dry_run_reports_eligibility_without_deleting_anything(): void
    {
        $user = $this->closedUser(now()->subDay());

        $this->artisan('accounts:delete-expired', ['--dry-run' => true])
            ->expectsOutputToContain('1 expired account(s) would be permanently deleted.')
            ->assertSuccessful();

        $this->assertModelExists($user);
    }

    private function closedUser(
        \DateTimeInterface $deletionDueAt,
        string $email = 'closed@example.test',
    ): User {
        return User::factory()->create([
            'email' => $email,
            'email_verified_at' => now(),
            'closed_at' => now()->subDays(30),
            'deletion_due_at' => $deletionDueAt,
            'closure_recovery_token_hash' => hash('sha256', Str::random(64)),
        ]);
    }

    private function device(User $user): ViewerDevice
    {
        return ViewerDevice::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'name' => 'Old Viewer',
            'proof_public_key' => $this->key(),
            'proof_jkt' => $this->key(),
            'agreement_public_key' => $this->key(),
            'agreement_jkt' => $this->key(),
            'status' => ViewerDeviceStatus::Suspended,
            'suspended_at' => now(),
        ]);
    }

    private function capsule(User $user): CreatorCapsule
    {
        return CreatorCapsule::query()->create([
            'user_id' => $user->getKey(),
            'registration_id' => 'registration_'.bin2hex(random_bytes(16)),
            'capsule_id' => 'urn:uuid:'.Str::uuid(),
            'capsule_revision' => 1,
            'payload_id' => 'primary',
            'broker' => 'https://broker.example.test',
            'release_handle' => $this->key(),
            'policy_sha256' => $this->key(),
            'policy' => [],
            'status' => CapsuleLifecycleStatus::Active,
            'pending_expires_at' => now()->addMinutes(15),
            'finalized_at' => now(),
        ]);
    }

    /** @return array{Token, RefreshToken, AuthCode} */
    private function oauthCredentials(User $user, ViewerDevice $device): array
    {
        $client = app(ExtensionOAuthClientProvisioner::class)->provision(
            ExtensionOAuthClientConfiguration::fromConfig(),
        );
        $accessToken = Token::query()->forceCreate([
            'id' => Str::random(80),
            'user_id' => $user->getKey(),
            'viewer_device_id' => $device->getKey(),
            'proof_jkt' => $device->proof_jkt,
            'client_id' => $client->getKey(),
            'scopes' => ['ctx:authorize'],
            'revoked' => true,
            'expires_at' => now()->subMinute(),
        ]);
        $refreshToken = RefreshToken::query()->forceCreate([
            'id' => Str::random(80),
            'access_token_id' => $accessToken->getKey(),
            'revoked' => true,
            'expires_at' => now()->addDay(),
        ]);
        $authCode = AuthCode::query()->forceCreate([
            'id' => Str::random(80),
            'user_id' => $user->getKey(),
            'client_id' => $client->getKey(),
            'scopes' => json_encode(['ctx:authorize'], JSON_THROW_ON_ERROR),
            'revoked' => true,
            'expires_at' => now()->subMinute(),
        ]);

        return [$accessToken, $refreshToken, $authCode];
    }

    private function key(): string
    {
        return sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }
}

final class RecordingTrustProfileRepository implements AccountTrustProfileRepository
{
    /** @var array<int, array<string, int>> */
    public array $profiles = [];

    public function deleteForAccount(int $accountId): void
    {
        unset($this->profiles[$accountId]);
    }
}

final class FailingDeletionParticipant implements AccountDeletionParticipant
{
    public function beforeAccountDeletion(User $user): void
    {
        throw new RuntimeException('Simulated deletion dependency failure.');
    }
}
