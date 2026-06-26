<?php

namespace Tests\Feature\OAuth;

use App\Ctx\Challenges\ChallengeAttemptOrchestrator;
use App\Ctx\Policy\CtxPolicyDigest;
use App\Ctx\SigningKeys\TicketSigningKeyLifecycle;
use App\Ctx\Tickets\CtxTicketBindings;
use App\Ctx\Tickets\ReleaseBindingVerifier;
use App\Http\Middleware\ValidateDpopAccessToken;
use App\Models\CtxAuthorizationTicket;
use App\Models\CtxAutomationRiskActivity;
use App\Models\CtxCapsuleMetricDenial;
use App\Models\CtxCapsuleMetricProjection;
use App\Models\CtxChallengeAttempt;
use App\Models\CtxMetricEventRecord;
use App\Models\User;
use App\Models\ViewerDevice;
use App\OAuth\ExtensionOAuthClientConfiguration;
use App\OAuth\ExtensionOAuthClientProvisioner;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Laravel\Passport\Http\Middleware\CheckToken;
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
            '',
            '.',
            'a.b',
            'a.b.c.d',
            '!!!!.!!!!.!!!!',
            str_repeat('x', 2048).'.b.c',
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

        $attackerKeypair = sodium_crypto_sign_seed_keypair(str_repeat("\x22", SODIUM_CRYPTO_SIGN_SEEDBYTES));
        $this->withHeaders([
            'Authorization' => 'DPoP '.$accessToken,
            'DPoP' => $this->proof(
                $resourceUrl,
                $accessToken,
                privateKey: sodium_crypto_sign_secretkey($attackerKeypair),
                publicKey: sodium_crypto_sign_publickey($attackerKeypair),
            ),
        ])->postJson($resourceUrl)
            ->assertUnauthorized()
            ->assertJsonPath('error', 'invalid_dpop_proof');
    }

    #[Test]
    public function a_creator_device_can_issue_a_short_lived_key_registration_grant(): void
    {
        [$user, $device] = $this->userAndDevice();
        $code = $this->approveAndExtractCode($user, 'capsule:create');
        $issued = $this->withHeader('DPoP', $this->proof())
            ->postJson(route('passport.token'), $this->tokenParameters($code, $device))
            ->assertOk()
            ->assertJsonPath('scope', 'capsule:create');
        $accessToken = $issued->json('access_token');
        $resourceUrl = route('api.broker-registration-grants.store');
        $policy = [
            'type' => 'ctx-policy', 'version' => 1, 'combiner' => 'all',
            'requirements' => [
                ['predicate' => 'ctx.account.email-verified', 'equals' => true],
                ['predicate' => 'ctx.account.active', 'equals' => true],
                ['predicate' => 'ctx.viewer.device-registered', 'equals' => true],
                ['predicate' => 'ctx.consent.capsule-view-event', 'equals' => true],
            ],
        ];

        $this->withHeaders([
            'Authorization' => 'DPoP '.$accessToken,
            'DPoP' => $this->proof($resourceUrl, $accessToken),
        ])->postJson($resourceUrl, [
            'registration_id' => 'registration_0000000001',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'payload_id' => 'primary-image',
            'policy_sha256' => (new CtxPolicyDigest)->calculate($policy),
            'policy' => $policy,
            'content_key_sha256' => str_repeat('h', 43),
            'title' => 'Protected landscape',
            'content_profile_id' => 'ctx.content.static-image',
            'content_profile_version' => '1.0',
            'media_type' => 'image/png',
        ])->assertCreated()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('type', 'broker-registration-grant')
            ->assertJsonPath('version', 1)
            ->assertJsonPath('expires_in', 60)
            ->assertJsonStructure(['grant', 'broker']);
        $this->assertDatabaseHas('creator_capsules', [
            'user_id' => $user->getKey(),
            'title' => 'Protected landscape',
            'content_profile_id' => 'ctx.content.static-image',
            'content_profile_version' => '1.0',
            'media_type' => 'image/png',
        ]);
    }

    #[Test]
    public function a_creator_device_can_register_a_trust_capsule_policy_against_local_development_services(): void
    {
        config()->set('sharecapsules.deployment.environment', 'local');
        [$user, $device] = $this->userAndDevice();
        $code = $this->approveAndExtractCode($user, 'capsule:create');
        $issued = $this->withHeader('DPoP', $this->proof())
            ->postJson(route('passport.token'), $this->tokenParameters($code, $device))
            ->assertOk()
            ->assertJsonPath('scope', 'capsule:create');
        $accessToken = $issued->json('access_token');
        $resourceUrl = route('api.broker-registration-grants.store');
        $policy = [
            'type' => 'ctx-policy',
            'version' => 1,
            'combiner' => 'all',
            'requirements' => [
                ['predicate' => 'ctx.account.email-verified', 'equals' => true],
                ['predicate' => 'ctx.account.active', 'equals' => true],
                ['predicate' => 'ctx.viewer.device-registered', 'equals' => true],
                ['predicate' => 'ctx.consent.capsule-view-event', 'equals' => true],
                [
                    'predicate' => 'ctx.risk.ecosystem-automation-not-high',
                    'issuer' => 'http://localhost:3003',
                ],
            ],
        ];

        $this->withHeaders([
            'Authorization' => 'DPoP '.$accessToken,
            'DPoP' => $this->proof($resourceUrl, $accessToken),
        ])->postJson($resourceUrl, [
            'registration_id' => 'registration_0000000002',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db704',
            'capsule_revision' => 1,
            'payload_id' => 'primary-image',
            'policy_sha256' => (new CtxPolicyDigest)->calculate($policy),
            'policy' => $policy,
            'content_key_sha256' => str_repeat('h', 43),
            'title' => 'Trusted only',
            'content_profile_id' => 'ctx.content.static-image',
            'content_profile_version' => '1.0',
            'media_type' => 'image/png',
        ])->assertCreated()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('type', 'broker-registration-grant');

        $this->assertDatabaseHas('creator_capsules', [
            'user_id' => $user->getKey(),
            'title' => 'Trusted only',
            'automation_risk_issuer' => 'http://localhost:3003',
        ]);
    }

    #[Test]
    public function an_eligible_viewer_receives_an_exact_privacy_safe_ctx_ticket(): void
    {
        config()->set('sharecapsules.broker.base_url', 'https://broker.example.test');
        $this->app->instance(ReleaseBindingVerifier::class, new class implements ReleaseBindingVerifier
        {
            public function valid(CtxTicketBindings $bindings): bool
            {
                return true;
            }
        });
        $key = app(TicketSigningKeyLifecycle::class)->stage();
        app(TicketSigningKeyLifecycle::class)->activate($key->kid);
        [$user, $device] = $this->userAndDevice();
        $code = $this->approveAndExtractCode($user, 'ctx:authorize');
        $issued = $this->withHeader('DPoP', $this->proof())
            ->postJson(route('passport.token'), $this->tokenParameters($code, $device))
            ->assertOk();
        $accessToken = $issued->json('access_token');
        $resourceUrl = route('ctx.authorize');
        $policy = [
            'type' => 'ctx-policy',
            'version' => 1,
            'combiner' => 'all',
            'requirements' => [
                ['predicate' => 'ctx.account.email-verified', 'equals' => true],
                ['predicate' => 'ctx.account.active', 'equals' => true],
                ['predicate' => 'ctx.viewer.device-registered', 'equals' => true],
                ['predicate' => 'ctx.consent.capsule-view-event', 'equals' => true],
            ],
        ];

        $response = $this->withHeaders([
            'Authorization' => 'DPoP '.$accessToken,
            'DPoP' => $this->proof($resourceUrl, $accessToken),
        ])->postJson($resourceUrl, [
            'type' => 'ctx-authorization-request',
            'version' => 1,
            'broker' => 'https://broker.example.test',
            'host_origin' => 'https://host.example.test',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'policy' => $policy,
            'policy_sha256' => app(CtxPolicyDigest::class)->calculate($policy),
            'payload_id' => 'primary-image',
            'release_handle' => 'opaque-release-handle-0001',
            'action' => 'render',
            'cryptographic_suite' => 'ctx-capsule-v1',
            'view_event_consent' => true,
            'viewer' => $this->viewerRelease(),
        ])->assertCreated()
            ->assertJsonPath('type', 'ctx-authorization')
            ->assertJsonPath('version', 1)
            ->assertJsonPath('expires_in', 60);
        $claims = $this->jwtClaims($response->json('ticket'));
        $this->assertArrayNotHasKey('sub', $claims);
        $this->assertSame($device->proof_jkt, $claims['ctx']['proof_jkt']);
        $this->assertSame($device->agreement_jkt, $claims['ctx']['agreement_jkt']);

        $this->withHeaders([
            'Authorization' => 'DPoP '.$accessToken,
            'DPoP' => $this->proof($resourceUrl, $accessToken),
        ])->postJson($resourceUrl, [
            'type' => 'ctx-authorization-request',
            'version' => 1,
            'broker' => 'https://broker.example.test',
            'host_origin' => 'https://host.example.test',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'policy' => $policy,
            'policy_sha256' => app(CtxPolicyDigest::class)->calculate($policy),
            'payload_id' => 'primary-image',
            'release_handle' => 'opaque-release-handle-0001',
            'action' => 'render',
            'cryptographic_suite' => 'ctx-capsule-v1',
            'view_event_consent' => false,
            'viewer' => $this->viewerRelease(),
        ])->assertForbidden()->assertJsonPath('code', 'consent_required');

        $metrics = CtxCapsuleMetricProjection::query()->sole();
        $this->assertSame(2, $metrics->authorization_attempts);
        $this->assertSame(1, $metrics->authorization_approved);
        $this->assertSame(1, $metrics->authorization_denied);
        $this->assertSame(0, $metrics->redemption_committed);
        $this->assertSame('consent', CtxCapsuleMetricDenial::query()->sole()->category);
        $this->assertSame(4, CtxMetricEventRecord::query()->count());
        $this->assertSame(2, CtxAutomationRiskActivity::query()->count());
        $this->assertFalse(Schema::hasColumn('ctx_metric_event_records', 'user_id'));
        $this->assertFalse(Schema::hasColumn('ctx_metric_event_records', 'viewer_device_id'));
    }

    #[Test]
    public function provider_policy_rejects_a_suspended_viewer_release_before_ticket_issuance(): void
    {
        config()->set('sharecapsules.extension.viewer.suspended_versions', ['0.1.0']);
        [$user, $device] = $this->userAndDevice();
        $code = $this->approveAndExtractCode($user, 'ctx:authorize');
        $issued = $this->withHeader('DPoP', $this->proof())
            ->postJson(route('passport.token'), $this->tokenParameters($code, $device))
            ->assertOk();
        $accessToken = $issued->json('access_token');
        $resourceUrl = route('ctx.authorize');
        $policy = [
            'type' => 'ctx-policy',
            'version' => 1,
            'combiner' => 'all',
            'requirements' => [
                ['predicate' => 'ctx.account.email-verified', 'equals' => true],
                ['predicate' => 'ctx.account.active', 'equals' => true],
                ['predicate' => 'ctx.viewer.device-registered', 'equals' => true],
                ['predicate' => 'ctx.consent.capsule-view-event', 'equals' => true],
            ],
        ];

        $this->withHeaders([
            'Authorization' => 'DPoP '.$accessToken,
            'DPoP' => $this->proof($resourceUrl, $accessToken),
        ])->postJson($resourceUrl, [
            'type' => 'ctx-authorization-request',
            'version' => 1,
            'broker' => 'https://broker.example.test',
            'host_origin' => 'https://host.example.test',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'policy' => $policy,
            'policy_sha256' => app(CtxPolicyDigest::class)->calculate($policy),
            'payload_id' => 'primary-image',
            'release_handle' => 'opaque-release-handle-0001',
            'action' => 'render',
            'cryptographic_suite' => 'ctx-capsule-v1',
            'view_event_consent' => true,
            'viewer' => $this->viewerRelease(),
        ])->assertUnprocessable()
            ->assertJsonPath('code', 'unsupported_contract');

        $this->assertDatabaseCount('ctx_authorization_tickets', 0);
        $this->assertSame(2, CtxMetricEventRecord::query()->count());
        $this->assertDatabaseHas('ctx_metric_event_records', [
            'event_type' => 'authorization_denied',
            'denial_category' => 'policy',
        ]);
    }

    #[Test]
    public function a_viewer_can_create_a_provider_hosted_challenge_attempt(): void
    {
        [$user, $device] = $this->userAndDevice();
        $code = $this->approveAndExtractCode($user, 'ctx:authorize');
        $issued = $this->withHeader('DPoP', $this->proof())
            ->postJson(route('passport.token'), $this->tokenParameters($code, $device))
            ->assertOk();
        $accessToken = $issued->json('access_token');
        $resourceUrl = route('ctx.challenge-attempts.store');

        $response = $this->withHeaders([
            'Authorization' => 'DPoP '.$accessToken,
            'DPoP' => $this->proof($resourceUrl, $accessToken),
        ])->postJson($resourceUrl, [
            'type' => 'ctx-challenge-attempt-request',
            'version' => 1,
            'host_origin' => 'https://host.example.test',
            'broker' => 'https://broker.example.test',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'policy_sha256' => str_repeat('a', 43),
            'payload_id' => 'primary-image',
            'release_handle' => 'opaque-release-handle-0001',
            'action' => 'render',
            'return_to' => 'https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback',
        ])->assertCreated()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('type', 'ctx-challenge-attempt')
            ->assertJsonPath('version', 1)
            ->assertJsonPath('challenge_set_version', 'ctx-challenge-set-v1.0')
            ->assertJsonPath('scoring_model_version', 'ctx-challenge-scoring-v1.0')
            ->assertJsonCount(1, 'modules')
            ->assertJsonStructure(['challenge_url'])
            ->assertJsonStructure([
                'attempt_id',
                'expires_in',
                'modules' => [
                    '*' => ['challenge_id', 'module_version', 'input_modes'],
                ],
            ]);

        $this->assertArrayNotHasKey('challenge_score', $response->json());
        $this->assertDatabaseHas('ctx_challenge_attempts', [
            'id' => $response->json('attempt_id'),
            'user_id' => $user->getKey(),
            'viewer_device_id' => $device->getKey(),
            'host_origin' => 'https://host.example.test',
            'status' => 'pending',
            'challenge_score' => null,
        ]);
        $challengeId = $response->json('modules.0.challenge_id');
        $this->assertContains($challengeId, [
            'balance_beam',
            'cargo_sort',
            'circuit_trace',
            'memory_path',
            'pattern_repair',
            'signal_tune',
        ]);
        $this->assertDatabaseCount('ctx_challenge_attempt_modules', 1);
        $this->assertDatabaseHas('ctx_challenge_attempt_modules', [
            'ctx_challenge_attempt_id' => $response->json('attempt_id'),
            'challenge_id' => $challengeId,
        ]);

        $this->withHeader('Host', 'localhost:3003')
            ->get($response->json('challenge_url'))
            ->assertOk()
            ->assertSee($this->challengeName($challengeId))
            ->assertSee('Complete check');

        $completionUrl = URL::temporarySignedRoute(
            $this->completionRoute($challengeId),
            CtxChallengeAttempt::query()->findOrFail($response->json('attempt_id'))->expires_at,
            [
                'attempt' => $response->json('attempt_id'),
                'return_to' => 'https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback',
            ],
        );
        $this->withHeader('Host', 'localhost:3003')->post($completionUrl, $this->completionPayload($challengeId))
            ->assertRedirect('https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback?status=completed');
        $this->assertDatabaseHas('ctx_challenge_attempts', [
            'id' => $response->json('attempt_id'),
            'status' => 'completed',
        ]);
    }

    #[Test]
    public function a_passing_provider_hosted_challenge_allows_the_original_trust_capsule_authorization_to_resume(): void
    {
        config()->set('sharecapsules.broker.base_url', 'https://broker.example.test');
        config()->set('sharecapsules.ctx.issuer', 'https://trust.example.test');
        $this->app->instance(ReleaseBindingVerifier::class, new class implements ReleaseBindingVerifier
        {
            public function valid(CtxTicketBindings $bindings): bool
            {
                return true;
            }
        });
        $key = app(TicketSigningKeyLifecycle::class)->stage();
        app(TicketSigningKeyLifecycle::class)->activate($key->kid);
        [$user, $device] = $this->userAndDevice();
        $code = $this->approveAndExtractCode($user, 'ctx:authorize');
        $issued = $this->withHeader('DPoP', $this->proof())
            ->postJson(route('passport.token'), $this->tokenParameters($code, $device))
            ->assertOk();
        $accessToken = $issued->json('access_token');
        $authorizeUrl = route('ctx.authorize');
        $policy = [
            'type' => 'ctx-policy',
            'version' => 1,
            'combiner' => 'all',
            'requirements' => [
                ['predicate' => 'ctx.account.email-verified', 'equals' => true],
                ['predicate' => 'ctx.account.active', 'equals' => true],
                ['predicate' => 'ctx.viewer.device-registered', 'equals' => true],
                ['predicate' => 'ctx.consent.capsule-view-event', 'equals' => true],
                [
                    'predicate' => 'ctx.risk.ecosystem-automation-not-high',
                    'issuer' => 'https://trust.example.test',
                ],
            ],
        ];
        $payload = [
            'type' => 'ctx-authorization-request',
            'version' => 1,
            'broker' => 'https://broker.example.test',
            'host_origin' => 'https://host.example.test',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'policy' => $policy,
            'policy_sha256' => app(CtxPolicyDigest::class)->calculate($policy),
            'payload_id' => 'primary-image',
            'release_handle' => 'opaque-release-handle-0001',
            'action' => 'render',
            'cryptographic_suite' => 'ctx-capsule-v1',
            'view_event_consent' => true,
            'viewer' => $this->viewerRelease(),
        ];

        $this->withHeaders([
            'Authorization' => 'DPoP '.$accessToken,
            'DPoP' => $this->proof($authorizeUrl, $accessToken),
        ])->postJson($authorizeUrl, $payload)
            ->assertForbidden()
            ->assertJsonPath('code', 'challenge_required');

        $challengeUrl = route('ctx.challenge-attempts.store');
        $challenge = $this->withHeaders([
            'Authorization' => 'DPoP '.$accessToken,
            'DPoP' => $this->proof($challengeUrl, $accessToken),
        ])->postJson($challengeUrl, [
            'type' => 'ctx-challenge-attempt-request',
            'version' => 1,
            'host_origin' => $payload['host_origin'],
            'broker' => $payload['broker'],
            'capsule_id' => $payload['capsule_id'],
            'capsule_revision' => $payload['capsule_revision'],
            'policy_sha256' => $payload['policy_sha256'],
            'payload_id' => $payload['payload_id'],
            'release_handle' => $payload['release_handle'],
            'action' => $payload['action'],
            'return_to' => 'https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback',
        ])->assertCreated();

        $attempt = CtxChallengeAttempt::query()->findOrFail($challenge->json('attempt_id'));
        $module = $attempt->modules()->firstOrFail();
        app(ChallengeAttemptOrchestrator::class)->recordModuleScore($attempt, $module->challenge_id, 80, ['completed']);

        $this->withHeaders([
            'Authorization' => 'DPoP '.$accessToken,
            'DPoP' => $this->proof($authorizeUrl, $accessToken),
        ])->postJson($authorizeUrl, $payload)
            ->assertCreated()
            ->assertJsonPath('type', 'ctx-authorization');
    }

    #[Test]
    public function duplicate_authorization_requests_reuse_the_short_lived_ticket(): void
    {
        config()->set('sharecapsules.broker.base_url', 'https://broker.example.test');
        $this->app->instance(ReleaseBindingVerifier::class, new class implements ReleaseBindingVerifier
        {
            public function valid(CtxTicketBindings $bindings): bool
            {
                return true;
            }
        });
        $key = app(TicketSigningKeyLifecycle::class)->stage();
        app(TicketSigningKeyLifecycle::class)->activate($key->kid);
        [$user, $device] = $this->userAndDevice();
        $code = $this->approveAndExtractCode($user, 'ctx:authorize');
        $issued = $this->withHeader('DPoP', $this->proof())
            ->postJson(route('passport.token'), $this->tokenParameters($code, $device))
            ->assertOk();
        $accessToken = $issued->json('access_token');
        $resourceUrl = route('ctx.authorize');
        $policy = [
            'type' => 'ctx-policy',
            'version' => 1,
            'combiner' => 'all',
            'requirements' => [
                ['predicate' => 'ctx.account.email-verified', 'equals' => true],
                ['predicate' => 'ctx.account.active', 'equals' => true],
                ['predicate' => 'ctx.viewer.device-registered', 'equals' => true],
                ['predicate' => 'ctx.consent.capsule-view-event', 'equals' => true],
                [
                    'predicate' => 'ctx.usage.capsule-account-lifetime-limit',
                    'scope' => 'account-and-capsule',
                    'maximum' => 5,
                ],
            ],
        ];
        $payload = [
            'type' => 'ctx-authorization-request',
            'version' => 1,
            'broker' => 'https://broker.example.test',
            'host_origin' => 'https://host.example.test',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'policy' => $policy,
            'policy_sha256' => app(CtxPolicyDigest::class)->calculate($policy),
            'payload_id' => 'primary-image',
            'release_handle' => 'opaque-release-handle-0001',
            'action' => 'render',
            'cryptographic_suite' => 'ctx-capsule-v1',
            'view_event_consent' => true,
            'viewer' => $this->viewerRelease(),
        ];

        $first = $this->withHeaders([
            'Authorization' => 'DPoP '.$accessToken,
            'DPoP' => $this->proof($resourceUrl, $accessToken),
        ])->postJson($resourceUrl, $payload)->assertCreated();
        $second = $this->withHeaders([
            'Authorization' => 'DPoP '.$accessToken,
            'DPoP' => $this->proof($resourceUrl, $accessToken),
        ])->postJson($resourceUrl, $payload)->assertCreated();

        $this->assertSame($first->json('ticket'), $second->json('ticket'));
        $this->assertDatabaseCount('ctx_authorization_tickets', 1);
        $this->assertSame('pending', CtxAuthorizationTicket::query()->sole()->status);
    }

    #[Test]
    public function authorization_idempotency_only_covers_the_immediate_opening_burst(): void
    {
        config()->set('sharecapsules.broker.base_url', 'https://broker.example.test');
        $this->app->instance(ReleaseBindingVerifier::class, new class implements ReleaseBindingVerifier
        {
            public function valid(CtxTicketBindings $bindings): bool
            {
                return true;
            }
        });
        $key = app(TicketSigningKeyLifecycle::class)->stage();
        app(TicketSigningKeyLifecycle::class)->activate($key->kid);
        [$user, $device] = $this->userAndDevice();
        $code = $this->approveAndExtractCode($user, 'ctx:authorize');
        $issued = $this->withHeader('DPoP', $this->proof())
            ->postJson(route('passport.token'), $this->tokenParameters($code, $device))
            ->assertOk();
        $accessToken = $issued->json('access_token');
        $resourceUrl = route('ctx.authorize');
        $policy = [
            'type' => 'ctx-policy',
            'version' => 1,
            'combiner' => 'all',
            'requirements' => [
                ['predicate' => 'ctx.account.email-verified', 'equals' => true],
                ['predicate' => 'ctx.account.active', 'equals' => true],
                ['predicate' => 'ctx.viewer.device-registered', 'equals' => true],
                ['predicate' => 'ctx.consent.capsule-view-event', 'equals' => true],
            ],
        ];
        $payload = [
            'type' => 'ctx-authorization-request',
            'version' => 1,
            'broker' => 'https://broker.example.test',
            'host_origin' => 'https://host.example.test',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'policy' => $policy,
            'policy_sha256' => app(CtxPolicyDigest::class)->calculate($policy),
            'payload_id' => 'primary-image',
            'release_handle' => 'opaque-release-handle-0001',
            'action' => 'render',
            'cryptographic_suite' => 'ctx-capsule-v1',
            'view_event_consent' => true,
            'viewer' => $this->viewerRelease(),
        ];

        $first = $this->withHeaders([
            'Authorization' => 'DPoP '.$accessToken,
            'DPoP' => $this->proof($resourceUrl, $accessToken),
        ])->postJson($resourceUrl, $payload)->assertCreated();
        $this->travel(4)->seconds();
        $second = $this->withHeaders([
            'Authorization' => 'DPoP '.$accessToken,
            'DPoP' => $this->proof($resourceUrl, $accessToken),
        ])->postJson($resourceUrl, $payload)->assertCreated();

        $this->assertNotSame($first->json('ticket'), $second->json('ticket'));
        $this->assertDatabaseCount('ctx_authorization_tickets', 2);
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

    /** @return array{name: string, version: string, browser_family: string, browser_major: int} */
    private function viewerRelease(): array
    {
        return [
            'name' => 'share-capsules-chromium-extension',
            'version' => '0.1.0',
            'browser_family' => 'Chrome',
            'browser_major' => 149,
        ];
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
        ?string $privateKey = null,
        ?string $publicKey = null,
    ): string {
        $privateKey ??= $this->privateKey;
        $publicKey ??= $this->publicKey;
        $header = $this->base64Url(json_encode([
            'typ' => 'dpop+jwt',
            'alg' => 'EdDSA',
            'jwk' => [
                'kty' => 'OKP',
                'crv' => 'Ed25519',
                'x' => $this->base64Url($publicKey),
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
        $signature = sodium_crypto_sign_detached($header.'.'.$payload, $privateKey);

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

    private function challengeName(string $challengeId): string
    {
        return match ($challengeId) {
            'balance_beam' => 'Balance Beam',
            'cargo_sort' => 'Cargo Sort',
            'circuit_trace' => 'Circuit Trace',
            'memory_path' => 'Memory Path',
            'pattern_repair' => 'Pattern Repair',
            'signal_tune' => 'Signal Tune',
            default => $challengeId,
        };
    }

    private function completionRoute(string $challengeId): string
    {
        return match ($challengeId) {
            'balance_beam' => 'ctx.challenge-attempts.balance-beam.complete',
            'cargo_sort' => 'ctx.challenge-attempts.cargo-sort.complete',
            'memory_path' => 'ctx.challenge-attempts.memory-path.complete',
            'pattern_repair' => 'ctx.challenge-attempts.pattern-repair.complete',
            'signal_tune' => 'ctx.challenge-attempts.signal-tune.complete',
            default => 'ctx.challenge-attempts.circuit-trace.complete',
        };
    }

    /** @return array<string, int|string> */
    private function completionPayload(string $challengeId): array
    {
        return match ($challengeId) {
            'balance_beam' => [
                'elapsed_ms' => 20000,
                'safe_ms' => 19000,
                'correction_count' => 16,
                'edge_touch_count' => 0,
                'input_mode' => 'pointer',
            ],
            'cargo_sort' => [
                'elapsed_ms' => 18000,
                'correct_count' => 9,
                'mistake_count' => 0,
                'move_count' => 9,
                'input_mode' => 'pointer',
            ],
            'memory_path' => [
                'elapsed_ms' => 30000,
                'sequence_length' => 5,
                'correct_count' => 5,
                'mistake_count' => 0,
                'replay_count' => 5,
                'input_mode' => 'pointer',
            ],
            'pattern_repair' => [
                'elapsed_ms' => 30000,
                'correct_count' => 5,
                'mistake_count' => 0,
                'attempt_count' => 5,
                'input_mode' => 'pointer',
            ],
            'signal_tune' => [
                'elapsed_ms' => 4200,
                'amplitude' => 40,
                'frequency' => 40,
                'phase' => 0,
                'adjustment_count' => 8,
                'input_mode' => 'pointer',
            ],
            default => [
                'elapsed_ms' => 2400,
                'path_checkpoints' => 8,
                'wall_touches' => 1,
                'input_mode' => 'keyboard',
            ],
        };
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function decodeBase64Url(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/'), true);
    }
}
