<?php

namespace Tests\Feature\OAuth;

use App\Http\Middleware\ValidateDpopAccessToken;
use App\Models\User;
use App\Models\ViewerDevice;
use App\OAuth\ExtensionOAuthClientConfiguration;
use App\OAuth\ExtensionOAuthClientProvisioner;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Laravel\Passport\Http\Middleware\CheckToken;
use Laravel\Passport\Passport;
use Laravel\Passport\RefreshToken;
use Laravel\Passport\Token;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class DpopTokenTest extends TestCase
{
    use RefreshDatabase;

    private ExtensionOAuthClientConfiguration $configuration;

    private string $privateKey;

    private string $publicKey;

    protected function setUp(): void
    {
        parent::setUp();

        $this->configureTestKeys();
        $this->configuration = ExtensionOAuthClientConfiguration::fromConfig();
        app(ExtensionOAuthClientProvisioner::class)->provision($this->configuration);
        $keypair = sodium_crypto_sign_seed_keypair(str_repeat("\x11", SODIUM_CRYPTO_SIGN_SEEDBYTES));
        $this->privateKey = sodium_crypto_sign_secretkey($keypair);
        $this->publicKey = sodium_crypto_sign_publickey($keypair);
        Route::post('/_test/dpop-resource', fn () => response()->json(['ok' => true]))
            ->middleware([ValidateDpopAccessToken::class, 'auth:api', CheckToken::class.':ctx:authorize']);
    }

    #[Test]
    public function an_active_registered_device_receives_a_sender_constrained_token(): void
    {
        [$user, $device] = $this->userAndDevice();
        $code = $this->approveAndExtractCode($user, 'ctx:authorize');

        $response = $this->withHeader('DPoP', $this->proof())
            ->postJson(route('passport.token'), $this->tokenParameters($code, $device));
        $response->assertOk()
            ->assertJsonPath('token_type', 'DPoP')
            ->assertJsonPath('scope', 'ctx:authorize')
            ->assertJsonStructure(['access_token', 'refresh_token', 'expires_in']);
        $claims = $this->jwtClaims($response->json('access_token'));
        $this->assertSame(['jkt' => $device->proof_jkt], $claims['cnf'] ?? null);
        $this->assertSame(rtrim((string) config('app.url'), '/'), $claims['iss'] ?? null);
        $this->assertSame('at+jwt', $this->jwtHeader($response->json('access_token'))['typ'] ?? null);

        $token = Token::query()->sole();
        $this->assertSame($device->getKey(), $token->getAttribute('viewer_device_id'));
        $this->assertSame($device->proof_jkt, $token->getAttribute('proof_jkt'));
        $this->assertFalse($token->revoked);
        $this->assertFalse(RefreshToken::query()->sole()->revoked);
    }

    #[Test]
    public function device_binding_rejects_missing_replayed_and_unregistered_proofs(): void
    {
        [$user, $device] = $this->userAndDevice();
        $code = $this->approveAndExtractCode($user, 'ctx:authorize');
        $parameters = $this->tokenParameters($code, $device);

        $this->postJson(route('passport.token'), $parameters)
            ->assertBadRequest()
            ->assertJsonPath('error', 'invalid_dpop_proof');

        $proof = $this->proof();
        $this->withHeader('DPoP', $proof)
            ->postJson(route('passport.token'), $parameters)
            ->assertOk();
        $this->withHeader('DPoP', $proof)
            ->postJson(route('passport.token'), $parameters)
            ->assertBadRequest()
            ->assertJsonPath('error', 'invalid_dpop_proof');

        [$otherUser, $otherDevice] = $this->userAndDevice('other@example.test', false);
        $otherCode = $this->approveAndExtractCode($otherUser, 'ctx:authorize');
        $this->withHeader('DPoP', $this->proof())
            ->postJson(route('passport.token'), $this->tokenParameters($otherCode, $otherDevice))
            ->assertBadRequest()
            ->assertJsonPath('error', 'invalid_grant');
    }

    #[Test]
    public function token_endpoint_proofs_fail_closed_on_target_time_and_claim_shape(): void
    {
        [$user, $device] = $this->userAndDevice();
        $code = $this->approveAndExtractCode($user, 'ctx:authorize');
        $parameters = $this->tokenParameters($code, $device);

        foreach ([
            $this->proof('https://attacker.example/oauth/token'),
            $this->proof(overrides: ['iat' => now()->subMinutes(2)->timestamp]),
            $this->proof(overrides: ['unexpected' => 'claim']),
        ] as $invalidProof) {
            $this->withHeader('DPoP', $invalidProof)
                ->postJson(route('passport.token'), $parameters)
                ->assertBadRequest()
                ->assertJsonPath('error', 'invalid_dpop_proof');
        }

        $this->withHeader('DPoP', $this->proof())
            ->postJson(route('passport.token'), $parameters)
            ->assertOk();
    }

    #[Test]
    public function refresh_tokens_rotate_and_replay_revokes_the_device_token_family(): void
    {
        [$user, $device] = $this->userAndDevice();
        $code = $this->approveAndExtractCode($user, 'ctx:authorize');
        $issued = $this->withHeader('DPoP', $this->proof())
            ->postJson(route('passport.token'), $this->tokenParameters($code, $device))
            ->assertOk();
        $oldRefreshToken = $issued->json('refresh_token');

        $rotated = $this->withHeader('DPoP', $this->proof())
            ->postJson(route('passport.token'), $this->refreshParameters($oldRefreshToken))
            ->assertOk()
            ->assertJsonPath('token_type', 'DPoP');
        $this->assertNotSame($oldRefreshToken, $rotated->json('refresh_token'));
        $this->assertSame(2, Token::query()->count());
        $this->assertSame(1, Token::query()->where('revoked', false)->count());
        $this->assertSame(1, RefreshToken::query()->where('revoked', false)->count());

        $this->withHeader('DPoP', $this->proof())
            ->postJson(route('passport.token'), $this->refreshParameters($oldRefreshToken))
            ->assertBadRequest()
            ->assertJsonPath('error', 'invalid_grant');
        $this->assertSame(0, Token::query()->where('revoked', false)->count());
        $this->assertSame(0, RefreshToken::query()->where('revoked', false)->count());
    }

    #[Test]
    public function suspending_a_device_immediately_revokes_its_access_and_refresh_tokens(): void
    {
        [$user, $device] = $this->userAndDevice();
        $code = $this->approveAndExtractCode($user, 'ctx:authorize');
        $issued = $this->withHeader('DPoP', $this->proof())
            ->postJson(route('passport.token'), $this->tokenParameters($code, $device))
            ->assertOk();

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->post(route('account.devices.suspend', $device))
            ->assertRedirect();

        $this->assertTrue(Token::query()->sole()->revoked);
        $this->assertTrue(RefreshToken::query()->sole()->revoked);
        $this->withHeader('DPoP', $this->proof())
            ->postJson(route('passport.token'), $this->refreshParameters($issued->json('refresh_token')))
            ->assertBadRequest()
            ->assertJsonPath('error', 'invalid_grant');
    }

    #[Test]
    public function a_bound_access_token_requires_a_fresh_matching_proof_on_resource_calls(): void
    {
        [$user, $device] = $this->userAndDevice();
        $code = $this->approveAndExtractCode($user, 'ctx:authorize');
        $issued = $this->withHeader('DPoP', $this->proof())
            ->postJson(route('passport.token'), $this->tokenParameters($code, $device))
            ->assertOk();
        $accessToken = $issued->json('access_token');
        $resourceUrl = url('/_test/dpop-resource');

        $this->withHeaders([
            'Authorization' => 'DPoP '.$accessToken,
            'DPoP' => $this->proof($resourceUrl, $accessToken),
        ])->postJson($resourceUrl)->assertOk()->assertJson(['ok' => true]);

        $this->withHeader('Authorization', 'Bearer '.$accessToken)
            ->postJson($resourceUrl)
            ->assertUnauthorized()
            ->assertJsonPath('error', 'invalid_token');

        $this->withHeaders([
            'Authorization' => 'DPoP '.$accessToken,
            'DPoP' => $this->proof($resourceUrl, 'wrong-token'),
        ])->postJson($resourceUrl)
            ->assertUnauthorized()
            ->assertJsonPath('error', 'invalid_dpop_proof');
    }

    /** @return array{User, ViewerDevice} */
    private function userAndDevice(
        string $email = 'viewer@example.test',
        bool $useProofKey = true,
    ): array {
        $user = User::factory()->create(['email' => $email, 'email_verified_at' => now()]);
        $publicKey = $this->base64Url($useProofKey ? $this->publicKey : random_bytes(32));
        $proofJkt = $this->base64Url(hash('sha256', json_encode([
            'crv' => 'Ed25519',
            'kty' => 'OKP',
            'x' => $publicKey,
        ], JSON_THROW_ON_ERROR), true));
        $device = ViewerDevice::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'name' => 'Test Viewer',
            'proof_public_key' => $publicKey,
            'proof_jkt' => $proofJkt,
            'agreement_public_key' => $this->base64Url(random_bytes(32)),
            'agreement_jkt' => $this->base64Url(random_bytes(32)),
            'status' => ViewerDeviceStatus::Active,
        ]);

        return [$user, $device];
    }

    private function approveAndExtractCode(User $user, string $scope): string
    {
        $verifier = str_repeat('a', 64);
        $parameters = [
            'client_id' => $this->configuration->id,
            'redirect_uri' => $this->configuration->redirectUri,
            'response_type' => 'code',
            'scope' => $scope,
            'state' => 'test-state',
            'code_challenge' => $this->base64Url(hash('sha256', $verifier, true)),
            'code_challenge_method' => 'S256',
            'prompt' => 'consent',
        ];
        $this->actingAs($user)->get(route('passport.authorizations.authorize', $parameters))->assertOk();
        $response = $this->post(route('passport.authorizations.approve'), [
            'state' => 'test-state',
            'client_id' => $this->configuration->id,
            'auth_token' => session('authToken'),
        ])->assertRedirect();
        parse_str((string) parse_url($response->headers->get('Location'), PHP_URL_QUERY), $query);

        return $query['code'];
    }

    /** @return array<string, string> */
    private function tokenParameters(string $code, ViewerDevice $device): array
    {
        return [
            'grant_type' => 'authorization_code',
            'client_id' => $this->configuration->id,
            'redirect_uri' => $this->configuration->redirectUri,
            'code' => $code,
            'code_verifier' => str_repeat('a', 64),
            'device_id' => (string) $device->getKey(),
        ];
    }

    /** @return array<string, string> */
    private function refreshParameters(string $refreshToken): array
    {
        return [
            'grant_type' => 'refresh_token',
            'client_id' => $this->configuration->id,
            'refresh_token' => $refreshToken,
        ];
    }

    /** @param array<string, mixed> $overrides */
    private function proof(
        ?string $target = null,
        ?string $accessToken = null,
        array $overrides = [],
    ): string {
        $header = $this->base64Url(json_encode([
            'typ' => 'dpop+jwt',
            'alg' => 'EdDSA',
            'jwk' => [
                'kty' => 'OKP',
                'crv' => 'Ed25519',
                'x' => $this->base64Url($this->publicKey),
            ],
        ], JSON_THROW_ON_ERROR));
        $claims = [
            'jti' => (string) Str::uuid7(),
            'htm' => 'POST',
            'htu' => $target ?? route('passport.token'),
            'iat' => now()->timestamp,
        ];
        if ($accessToken !== null) {
            $claims['ath'] = $this->base64Url(hash('sha256', $accessToken, true));
        }
        $claims = array_merge($claims, $overrides);
        $payload = $this->base64Url(json_encode($claims, JSON_THROW_ON_ERROR));
        $signature = sodium_crypto_sign_detached($header.'.'.$payload, $this->privateKey);

        return $header.'.'.$payload.'.'.$this->base64Url($signature);
    }

    /** @return array<string, mixed> */
    private function jwtClaims(string $token): array
    {
        $parts = explode('.', $token);

        return json_decode($this->decodeBase64Url($parts[1]), true, flags: JSON_THROW_ON_ERROR);
    }

    /** @return array<string, mixed> */
    private function jwtHeader(string $token): array
    {
        $parts = explode('.', $token);

        return json_decode($this->decodeBase64Url($parts[0]), true, flags: JSON_THROW_ON_ERROR);
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function decodeBase64Url(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/'), true);
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
