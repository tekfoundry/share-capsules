<?php

namespace Tests\Feature\OAuth;

use App\Models\User;
use App\OAuth\ExtensionOAuthClientConfiguration;
use App\OAuth\ExtensionOAuthClientProvisioner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use InvalidArgumentException;
use Laravel\Passport\Client;
use Laravel\Passport\Passport;
use Laravel\Passport\Token;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class ExtensionAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private ExtensionOAuthClientConfiguration $configuration;

    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->configureTestKeys();
        $this->configuration = ExtensionOAuthClientConfiguration::fromConfig();
        $this->client = app(ExtensionOAuthClientProvisioner::class)->provision($this->configuration);
    }

    #[Test]
    public function the_fixed_extension_client_is_public_and_has_one_exact_callback(): void
    {
        $this->assertNull($this->client->secret);
        $this->assertSame([$this->configuration->redirectUri], $this->client->redirect_uris);
        $this->assertSame(['authorization_code'], $this->client->grant_types);
        $this->assertFalse($this->client->revoked);

        app(ExtensionOAuthClientProvisioner::class)->provision($this->configuration);

        $this->assertDatabaseCount('oauth_clients', 1);
    }

    #[Test]
    public function only_the_required_oauth_routes_are_exposed(): void
    {
        $this->assertNotNull(Route::getRoutes()->getByName('passport.authorizations.authorize'));
        $this->assertNotNull(Route::getRoutes()->getByName('passport.authorizations.approve'));
        $this->assertNotNull(Route::getRoutes()->getByName('passport.authorizations.deny'));
        $this->assertNotNull(Route::getRoutes()->getByName('passport.token'));
        $this->assertNull(Route::getRoutes()->getByName('passport.device'));
        $this->assertNull(Route::getRoutes()->getByName('passport.device.code'));
        $this->assertNull(Route::getRoutes()->getByName('passport.token.refresh'));
    }

    #[Test]
    public function provisioning_refuses_a_callback_that_does_not_match_the_extension_id(): void
    {
        config()->set(
            'sharecapsules.oauth.extension_redirect_uri',
            'https://attacker.example/oauth/callback',
        );

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('must exactly match the extension ID');

        ExtensionOAuthClientConfiguration::fromConfig();
    }

    #[Test]
    public function authorization_requires_a_verified_account(): void
    {
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)
            ->get(route('passport.authorizations.authorize', $this->authorizationParameters()))
            ->assertRedirect(route('verification.notice'));
    }

    #[Test]
    public function a_valid_s256_request_presents_explicit_consent_without_credentials(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $this->actingAs($user)
            ->get(route('passport.authorizations.authorize', $this->authorizationParameters()))
            ->assertOk()
            ->assertSee('Connect the Viewer?')
            ->assertSee('Connect the Viewer extension to this account.')
            ->assertSee('never receives your password')
            ->assertSee('Connect extension')
            ->assertSee('Deny');
    }

    #[Test]
    public function an_unregistered_callback_is_rejected_without_redirecting_to_it(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $parameters = $this->authorizationParameters();
        $parameters['redirect_uri'] = 'https://attacker.example/oauth/callback';

        $response = $this->actingAs($user)
            ->get(route('passport.authorizations.authorize', $parameters));

        $response->assertUnauthorized();
        $this->assertStringNotContainsString('attacker.example', (string) $response->headers->get('Location'));
    }

    #[Test]
    public function a_public_client_request_without_s256_pkce_is_rejected(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $parameters = $this->authorizationParameters();
        unset($parameters['code_challenge'], $parameters['code_challenge_method']);

        $this->actingAs($user)
            ->get(route('passport.authorizations.authorize', $parameters))
            ->assertBadRequest()
            ->assertSee('invalid_request');
    }

    #[Test]
    public function approved_consent_issues_a_single_use_code_bound_to_the_verifier(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $verifier = str_repeat('a', 64);
        $code = $this->approveAndExtractCode($user, $verifier, 'approved-state');

        $wrongVerifier = $this->postJson(route('passport.token'), $this->tokenParameters(
            $code,
            str_repeat('b', 64),
        ));
        $wrongVerifier->assertBadRequest()->assertJsonPath('error', 'invalid_grant');

        $token = $this->postJson(route('passport.token'), $this->tokenParameters(
            $code,
            $verifier,
        ));

        $token->assertOk()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('expires_in', 600)
            ->assertJsonMissingPath('refresh_token');

        $storedToken = Token::query()->sole();
        $this->assertSame(['extension:connect'], $storedToken->scopes);
        $this->assertTrue($storedToken->expires_at->between(
            now()->addMinutes(9),
            now()->addMinutes(10)->addSeconds(5),
        ));

        $this->postJson(route('passport.token'), $this->tokenParameters($code, $verifier))
            ->assertBadRequest()
            ->assertJsonPath('error', 'invalid_grant');
    }

    #[Test]
    public function denied_consent_returns_only_the_oauth_error_and_original_state(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $parameters = $this->authorizationParameters(state: 'denied-state');

        $page = $this->actingAs($user)
            ->get(route('passport.authorizations.authorize', $parameters));
        $page->assertOk();

        $response = $this->delete(route('passport.authorizations.deny'), [
            'state' => 'denied-state',
            'client_id' => $this->configuration->id,
            'auth_token' => session('authToken'),
        ]);

        $response->assertRedirect();
        $callback = $this->redirectQuery($response->headers->get('Location'));
        $this->assertSame('access_denied', $callback['error'] ?? null);
        $this->assertSame('denied-state', $callback['state'] ?? null);
        $this->assertArrayNotHasKey('code', $callback);
    }

    /** @return array<string, string> */
    private function authorizationParameters(
        string $verifier = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        string $state = 'test-state',
    ): array {
        return [
            'client_id' => $this->configuration->id,
            'redirect_uri' => $this->configuration->redirectUri,
            'response_type' => 'code',
            'scope' => implode(' ', $this->configuration->scopes),
            'state' => $state,
            'code_challenge' => $this->challenge($verifier),
            'code_challenge_method' => 'S256',
            'prompt' => 'consent',
        ];
    }

    private function approveAndExtractCode(User $user, string $verifier, string $state): string
    {
        $parameters = $this->authorizationParameters($verifier, $state);
        $this->actingAs($user)
            ->get(route('passport.authorizations.authorize', $parameters))
            ->assertOk();

        $response = $this->post(route('passport.authorizations.approve'), [
            'state' => $state,
            'client_id' => $this->configuration->id,
            'auth_token' => session('authToken'),
        ]);
        $response->assertRedirect();
        $query = $this->redirectQuery($response->headers->get('Location'));

        $this->assertSame($state, $query['state'] ?? null);
        $this->assertIsString($query['code'] ?? null);

        return $query['code'];
    }

    /** @return array<string, string> */
    private function tokenParameters(string $code, string $verifier): array
    {
        return [
            'grant_type' => 'authorization_code',
            'client_id' => $this->configuration->id,
            'redirect_uri' => $this->configuration->redirectUri,
            'code' => $code,
            'code_verifier' => $verifier,
        ];
    }

    private function challenge(string $verifier): string
    {
        return rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');
    }

    /** @return array<string, string> */
    private function redirectQuery(?string $location): array
    {
        $this->assertNotNull($location);
        parse_str((string) parse_url($location, PHP_URL_QUERY), $query);

        return array_filter($query, 'is_string');
    }

    private function configureTestKeys(): void
    {
        $directory = storage_path('framework/testing/passport');
        $privatePath = $directory.'/oauth-private.key';
        $publicPath = $directory.'/oauth-public.key';

        if (! File::exists($privatePath) || ! File::exists($publicPath)) {
            File::ensureDirectoryExists($directory);
            $key = openssl_pkey_new([
                'private_key_bits' => 2048,
                'private_key_type' => OPENSSL_KEYTYPE_RSA,
            ]);
            $this->assertNotFalse($key);
            $this->assertTrue(openssl_pkey_export($key, $privateKey));
            $details = openssl_pkey_get_details($key);
            $this->assertIsArray($details);
            File::put($privatePath, $privateKey);
            File::put($publicPath, $details['key']);
        }

        File::chmod($privatePath, 0600);
        File::chmod($publicPath, 0600);

        Passport::loadKeysFrom($directory);
    }
}
