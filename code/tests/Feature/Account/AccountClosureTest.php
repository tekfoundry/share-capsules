<?php

namespace Tests\Feature\Account;

use App\Account\Closure\AccountClosureService;
use App\Broker\Lifecycle\BrokerContentKeyLifecycle;
use App\Broker\Lifecycle\BrokerContentKeyLifecycleFailed;
use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Models\BrokerRegistrationGrant;
use App\Models\CreatorCapsule;
use App\Models\CtxCapsuleMetricProjection;
use App\Models\User;
use App\Models\ViewerDevice;
use App\Models\ViewerDeviceChallenge;
use App\Notifications\AccountClosureStarted;
use App\Notifications\AccountRestored;
use App\OAuth\ExtensionOAuthClientConfiguration;
use App\OAuth\ExtensionOAuthClientProvisioner;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Auth\Events\Login;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Passport\AuthCode;
use Laravel\Passport\Passport;
use Laravel\Passport\RefreshToken;
use Laravel\Passport\Token;
use Tests\Support\FakeBrokerContentKeyLifecycle;
use Tests\TestCase;

final class AccountClosureTest extends TestCase
{
    use RefreshDatabase;

    public function test_closure_requires_recent_authentication_and_explicit_acknowledgement(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $this->actingAs($user)
            ->get(route('account.closure.show'))
            ->assertRedirect(route('password.confirm'));

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->post(route('account.closure.store'))
            ->assertSessionHasErrors('acknowledge');
        $this->assertFalse($user->fresh()->isClosed());
    }

    public function test_closure_immediately_suspends_every_account_access_path(): void
    {
        Notification::fake();
        $this->freezeTime();
        $broker = $this->app->make(BrokerContentKeyLifecycle::class);
        $this->assertInstanceOf(FakeBrokerContentKeyLifecycle::class, $broker);
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'remember_token' => 'old-remember-token',
        ]);
        $activeDevice = $this->device($user, ViewerDeviceStatus::Active);
        BrokerRegistrationGrant::query()->create([
            'token_hash' => hash('sha256', 'closure-grant'),
            'user_id' => $user->getKey(),
            'viewer_device_id' => $activeDevice->getKey(),
            'registration_id' => 'closure-registration',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'payload_id' => 'primary-image',
            'policy_sha256' => str_repeat('p', 43),
            'content_key_sha256' => str_repeat('k', 43),
            'expires_at' => now()->addMinute(),
        ]);
        CreatorCapsule::query()->create([
            'user_id' => $user->getKey(),
            'registration_id' => 'registration_'.str_repeat('a', 32),
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'payload_id' => 'primary-image',
            'broker' => 'https://broker.example.test',
            'release_handle' => str_repeat('h', 43),
            'policy_sha256' => str_repeat('p', 43),
            'policy' => [],
            'status' => CapsuleLifecycleStatus::Active,
            'pending_expires_at' => now()->addMinutes(15),
            'finalized_at' => now(),
        ]);
        $revokedDevice = $this->device($user, ViewerDeviceStatus::Revoked);
        [$accessToken, $refreshToken, $authCode] = $this->oauthCredentials($user, $activeDevice);
        $challenge = $this->challenge($user, $activeDevice);
        DB::table('sessions')->insert([
            ['id' => 'session-one', 'user_id' => $user->getKey(), 'payload' => '', 'last_activity' => now()->timestamp],
            ['id' => 'session-two', 'user_id' => $user->getKey(), 'payload' => '', 'last_activity' => now()->timestamp],
        ]);

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->post(route('account.closure.store'), ['acknowledge' => '1'])
            ->assertRedirect(route('account.restore.notice'));

        $this->assertGuest();
        $user->refresh();
        $this->assertTrue($user->isClosed());
        $this->assertTrue($user->isRecoverable());
        $this->assertTrue($user->closed_at->isSameSecond(now()));
        $this->assertTrue($user->deletion_due_at->isSameSecond(now()->addDays(30)));
        $this->assertNotSame('old-remember-token', $user->remember_token);
        $this->assertSame(ViewerDeviceStatus::Suspended, $activeDevice->fresh()->status);
        $this->assertSame(ViewerDeviceStatus::Revoked, $revokedDevice->fresh()->status);
        $this->assertTrue($accessToken->fresh()->revoked);
        $this->assertTrue($refreshToken->fresh()->revoked);
        $this->assertTrue($authCode->fresh()->revoked);
        $this->assertModelMissing($challenge);
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->getKey()]);
        Notification::assertSentTo($user, AccountClosureStarted::class);
        $this->assertContains([
            'operation' => 'pause_creator',
            'creator_id' => (int) $user->getKey(),
        ], $broker->operations);
        $this->assertSame(1, CtxCapsuleMetricProjection::query()->sole()->release_paused);
    }

    public function test_capsule_inventory_is_available_before_closure_and_during_recovery(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email_verified_at' => now()]);

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->get(route('account.closure.inventory'))
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertHeader('Content-Disposition', 'attachment; filename="share-capsules-inventory.json"')
            ->assertJsonPath('type', 'share-capsules-account-capsule-inventory')
            ->assertJsonPath('version', '1.0')
            ->assertJsonPath('account_status', 'active')
            ->assertJsonPath('capsule_count', 0)
            ->assertJsonPath('capsules', []);

        app(AccountClosureService::class)->close($user);
        $url = $this->recoveryUrl($user);
        $page = $this->get($url)->assertOk()->assertSee('Restore your account?');
        $inventoryUrl = $this->formOrLinkUrl($page->getContent(), 'inventory');

        $this->get($inventoryUrl)
            ->assertOk()
            ->assertJsonPath('account_status', 'pending_deletion')
            ->assertJsonPath('deletion_due_at', $user->fresh()->deletion_due_at->toIso8601String());
    }

    public function test_broker_unavailability_cannot_leave_the_account_open_for_release(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email_verified_at' => now()]);
        $this->mock(BrokerContentKeyLifecycle::class)
            ->shouldReceive('pauseCreator')
            ->once()
            ->with((int) $user->getKey())
            ->andThrow(new BrokerContentKeyLifecycleFailed('Broker unavailable.'));

        app(AccountClosureService::class)->close($user);

        $this->assertTrue($user->fresh()->isClosed());
        Notification::assertSentTo($user, AccountClosureStarted::class);
    }

    public function test_a_valid_email_link_restores_the_account_without_reviving_credentials(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email_verified_at' => now()]);
        $broker = $this->app->make(BrokerContentKeyLifecycle::class);
        $this->assertInstanceOf(FakeBrokerContentKeyLifecycle::class, $broker);
        $device = $this->device($user, ViewerDeviceStatus::Active);
        [$accessToken, $refreshToken] = $this->oauthCredentials($user, $device);
        app(AccountClosureService::class)->close($user);
        $url = $this->recoveryUrl($user);
        $page = $this->get($url)->assertOk();
        $restoreUrl = $this->formOrLinkUrl($page->getContent(), 'restore');

        $this->post($restoreUrl)
            ->assertRedirect(route('login'))
            ->assertSessionHas('status', 'Your account was restored. Sign in again to continue.');

        $user->refresh();
        $this->assertFalse($user->isClosed());
        $this->assertNull($user->deletion_due_at);
        $this->assertNull($user->closure_recovery_token_hash);
        $this->assertNotNull($user->last_restored_at);
        $this->assertSame(ViewerDeviceStatus::Suspended, $device->fresh()->status);
        $this->assertTrue($accessToken->fresh()->revoked);
        $this->assertTrue($refreshToken->fresh()->revoked);
        Notification::assertSentTo($user, AccountRestored::class);
        $this->assertContains([
            'operation' => 'resume_creator',
            'creator_id' => (int) $user->getKey(),
        ], $broker->operations);

        $this->post($restoreUrl)->assertNotFound();
    }

    public function test_recovery_requests_are_concealed_and_expired_accounts_cannot_restore(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email_verified_at' => now()]);
        app(AccountClosureService::class)->close($user);
        Notification::fake();

        $publicResponse = 'If that address belongs to a recoverable account, a new recovery link has been sent.';
        $this->post(route('account.restore.send'), ['email' => 'missing@example.test'])
            ->assertSessionHas('status', $publicResponse);
        $this->post(route('account.restore.send'), ['email' => $user->email])
            ->assertSessionHas('status', $publicResponse);
        Notification::assertSentTo($user, AccountClosureStarted::class);

        $url = $this->recoveryUrl($user);
        $this->travel(31)->days();
        $this->get($url)->assertForbidden();
        $this->assertFalse(app(AccountClosureService::class)->restore($user->fresh(), 'wrong-token'));
    }

    public function test_closed_accounts_cannot_sign_in_or_receive_new_oauth_tokens(): void
    {
        Notification::fake();
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'password' => 'Correct-Horse-42!',
        ]);
        app(AccountClosureService::class)->close($user);

        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'Correct-Horse-42!',
        ])->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertRedirect(route('account.restore.notice'));
        $this->assertGuest();

        Passport::actingAs($user, ['extension:connect']);
        $this->post(route('api.viewer-devices.challenges.store'))
            ->assertForbidden()
            ->assertJsonPath('error', 'account_unavailable');
    }

    public function test_any_authenticator_is_logged_out_if_it_resolves_a_closed_account(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email_verified_at' => now()]);
        app(AccountClosureService::class)->close($user);
        $this->actingAs($user);

        try {
            Event::dispatch(new Login('web', $user, false));
            $this->fail('Closed-account login should have been rejected.');
        } catch (ValidationException $exception) {
            $this->assertSame(trans('auth.failed'), $exception->errors()['email'][0]);
        }

        $this->assertGuest();
    }

    private function device(User $user, ViewerDeviceStatus $status): ViewerDevice
    {
        return ViewerDevice::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'name' => 'Test Viewer',
            'proof_public_key' => $this->key(),
            'proof_jkt' => $this->key(),
            'agreement_public_key' => $this->key(),
            'agreement_jkt' => $this->key(),
            'status' => $status,
            'revoked_at' => $status === ViewerDeviceStatus::Revoked ? now() : null,
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
            'revoked' => false,
            'expires_at' => now()->addMinutes(10),
        ]);
        $refreshToken = RefreshToken::query()->forceCreate([
            'id' => Str::random(80),
            'access_token_id' => $accessToken->getKey(),
            'revoked' => false,
            'expires_at' => now()->addDays(30),
        ]);
        $authCode = AuthCode::query()->forceCreate([
            'id' => Str::random(80),
            'user_id' => $user->getKey(),
            'client_id' => $client->getKey(),
            'scopes' => json_encode(['ctx:authorize'], JSON_THROW_ON_ERROR),
            'revoked' => false,
            'expires_at' => now()->addMinutes(10),
        ]);

        return [$accessToken, $refreshToken, $authCode];
    }

    private function challenge(User $user, ViewerDevice $device): ViewerDeviceChallenge
    {
        return ViewerDeviceChallenge::query()->create([
            'id' => (string) Str::uuid7(),
            'device_id' => $device->getKey(),
            'user_id' => $user->getKey(),
            'nonce' => $this->key(),
            'proof_public_key' => $this->key(),
            'proof_jkt' => $this->key(),
            'agreement_public_key' => $this->key(),
            'agreement_jkt' => $this->key(),
            'server_agreement_public_key' => $this->key(),
            'agreement_confirmation_hash' => random_bytes(32),
            'expires_at' => now()->addMinutes(5),
        ]);
    }

    private function recoveryUrl(User $user): string
    {
        $notification = Notification::sent($user, AccountClosureStarted::class)->last();
        $this->assertInstanceOf(AccountClosureStarted::class, $notification);

        return $notification->toMail($user)->actionUrl;
    }

    private function formOrLinkUrl(string $html, string $kind): string
    {
        $pattern = $kind === 'restore'
            ? '/<form[^>]+action="([^"]+)"/'
            : '/href="([^"]+)"[^>]*>Download Capsule inventory/';
        $this->assertSame(1, preg_match($pattern, $html, $matches));

        return html_entity_decode($matches[1]);
    }

    private function key(): string
    {
        return sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }
}
