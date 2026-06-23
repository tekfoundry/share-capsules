<?php

namespace Tests\Feature\Broker;

use App\Broker\Audit\BrokerAuditSink;
use App\Broker\Keys\KeyProtectionContext;
use App\Broker\Keys\KeyProtectionService;
use App\Broker\Keys\ProtectedKeyMaterial;
use App\Broker\Lifecycle\BrokerContentKeyStatus;
use App\Broker\Registration\RegistrationAuthorizationFailed;
use App\Broker\Registration\RegistrationGrantAuthorizer;
use App\Broker\Registration\RegistrationGrantPrincipal;
use App\Broker\Release\InvalidDeviceProof;
use App\Broker\Release\PrepareKeyRelease;
use App\Broker\Release\TicketPublicKeyResolver;
use App\Ctx\Contracts\CanonicalJson;
use App\Models\BrokerContentKey;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
use SensitiveParameter;
use Tests\BrokerTestCase;

#[RunTestsInSeparateProcesses]
#[PreserveGlobalState(false)]
final class ContentKeyRegistrationTest extends BrokerTestCase
{
    private string $contentKey;

    /** @var array<string, string|int> */
    private array $request;

    protected function setUp(): void
    {
        parent::setUp();
        Schema::connection('broker')->create('broker_content_keys', function (Blueprint $table): void {
            $table->string('record_id', 43)->primary();
            $table->string('registration_id', 128)->unique();
            $table->string('release_handle', 43)->unique();
            $table->string('creator_id')->nullable();
            $table->string('capsule_id', 45);
            $table->unsignedBigInteger('capsule_revision');
            $table->string('payload_id', 64);
            $table->string('policy_sha256', 43);
            $table->string('content_key_sha256', 43);
            $table->string('protection_algorithm', 64);
            $table->string('protection_key_id', 128);
            $table->string('protection_nonce', 64);
            $table->text('protected_content_key');
            $table->string('status', 16);
            $table->timestamp('pending_expires_at')->nullable();
            $table->timestamp('finalized_at')->nullable();
            $table->timestamp('paused_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('destroyed_at')->nullable();
            $table->timestamps();
            $table->unique(['capsule_id', 'payload_id']);
        });
        Schema::connection('broker')->create('broker_device_proofs', function (Blueprint $table): void {
            $table->string('jti', 128)->primary();
            $table->string('ticket_jti', 128);
            $table->timestamp('expires_at');
            $table->timestamps();
        });
        $this->app->instance(RegistrationGrantAuthorizer::class, new class implements RegistrationGrantAuthorizer
        {
            public function authorize(
                #[SensitiveParameter] string $grant,
                string $registrationId,
                string $capsuleId,
                string $payloadId,
                string $contentKeySha256,
            ): RegistrationGrantPrincipal {
                return new RegistrationGrantPrincipal('42', 1, str_repeat('p', 43));
            }
        });
        $this->app->instance(BrokerAuditSink::class, new class implements BrokerAuditSink
        {
            public function record(string $event, array $context = []): void {}
        });
        $this->contentKey = random_bytes(32);
        $this->request = [
            'type' => 'broker-key-registration',
            'version' => 1,
            'grant' => sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING),
            'registration_id' => 'registration_0000000001',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'payload_id' => 'primary-image',
            'content_key' => sodium_bin2base64($this->contentKey, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING),
        ];
    }

    public function test_it_registers_protected_key_material_and_returns_an_opaque_handle(): void
    {
        $response = $this->postJson('/registrations', $this->request)
            ->assertCreated()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('type', 'broker-key-registration')
            ->assertJsonPath('version', 1);
        $handle = $response->json('release_handle');
        $this->assertIsString($handle);
        $this->assertSame(43, strlen($handle));

        $stored = BrokerContentKey::query()->sole();
        $this->assertSame(BrokerContentKeyStatus::Pending, $stored->status);
        $this->assertNotNull($stored->pending_expires_at);
        $serialized = json_encode($stored->toArray(), JSON_THROW_ON_ERROR);
        $this->assertStringNotContainsString($this->request['content_key'], $serialized);
        $recovered = app(KeyProtectionService::class)->recover(
            new ProtectedKeyMaterial(
                $stored->protection_algorithm,
                $stored->protection_key_id,
                $stored->protection_nonce,
                $stored->protected_content_key,
            ),
            new KeyProtectionContext($stored->record_id),
        );
        $this->assertSame($this->contentKey, $recovered->bytes());

        $this->postJson('/registrations', $this->request)
            ->assertOk()
            ->assertJsonPath('release_handle', $handle);
        $this->assertSame(1, BrokerContentKey::query()->count());

        $binding = [
            'capsule_id' => $this->request['capsule_id'],
            'capsule_revision' => 1,
            'policy_sha256' => str_repeat('p', 43),
            'payload_id' => $this->request['payload_id'],
            'release_handle' => $handle,
        ];
        $this->withToken('test-broker-control-plane-token-0001')
            ->postJson('/internal/release-bindings/validate', $binding)
            ->assertOk()->assertExactJson(['valid' => false]);
        $this->withToken('test-broker-control-plane-token-0001')
            ->postJson('/internal/content-keys/lifecycle', [
                'operation' => 'finalize_registration',
                'creator_id' => '42',
                'registration_id' => $this->request['registration_id'],
                'release_handle' => $handle,
            ])->assertOk()->assertJsonPath('changed_records', 1);
        $this->assertSame(BrokerContentKeyStatus::Active, $stored->refresh()->status);
        $this->assertNull($stored->pending_expires_at);
        $this->assertNotNull($stored->finalized_at);

        $this->withToken('test-broker-control-plane-token-0001')
            ->postJson('/internal/release-bindings/validate', $binding)
            ->assertOk()->assertExactJson(['valid' => true]);
    }

    public function test_it_rejects_unknown_fields_and_noncanonical_keys(): void
    {
        $this->postJson('/registrations', [...$this->request, 'unexpected' => true])
            ->assertUnprocessable();
        $this->postJson('/registrations', [...$this->request, 'content_key' => str_repeat('_', 43)])
            ->assertUnprocessable();
        $this->assertSame(0, BrokerContentKey::query()->count());
    }

    public function test_it_fails_closed_when_the_control_plane_does_not_authorize_registration(): void
    {
        $this->app->instance(RegistrationGrantAuthorizer::class, new class implements RegistrationGrantAuthorizer
        {
            public function authorize(
                #[SensitiveParameter] string $grant,
                string $registrationId,
                string $capsuleId,
                string $payloadId,
                string $contentKeySha256,
            ): RegistrationGrantPrincipal {
                throw new RegistrationAuthorizationFailed('No.');
            }
        });

        $this->postJson('/registrations', $this->request)
            ->assertUnauthorized()
            ->assertExactJson(['error' => 'registration_not_authorized']);
        $this->assertSame(0, BrokerContentKey::query()->count());
    }

    public function test_it_strictly_validates_device_proof_and_prepares_hpke_without_releasing(): void
    {
        $handle = $this->postJson('/registrations', $this->request)->assertCreated()->json('release_handle');
        $this->withToken('test-broker-control-plane-token-0001')
            ->postJson('/internal/content-keys/lifecycle', [
                'operation' => 'finalize_registration',
                'creator_id' => '42',
                'registration_id' => $this->request['registration_id'],
                'release_handle' => $handle,
            ])->assertOk();
        config()->set('sharecapsules.ctx.issuer', 'https://provider.example.test');
        $ticketKeys = sodium_crypto_sign_keypair();
        $ticketPublic = sodium_crypto_sign_publickey($ticketKeys);
        $this->app->instance(TicketPublicKeyResolver::class, new class($ticketPublic) implements TicketPublicKeyResolver
        {
            public function __construct(private readonly string $key) {}

            public function resolve(string $issuer, string $kid): string
            {
                return $this->key;
            }
        });
        $proofKeys = sodium_crypto_sign_keypair();
        $proofPublic = sodium_crypto_sign_publickey($proofKeys);
        $proofX = $this->encode($proofPublic);
        $proofJkt = $this->thumbprint(['crv' => 'Ed25519', 'kty' => 'OKP', 'x' => $proofX]);
        $agreementPrivate = random_bytes(32);
        $agreementPublic = sodium_crypto_scalarmult_base($agreementPrivate);
        $agreementX = $this->encode($agreementPublic);
        $agreementJkt = $this->thumbprint(['crv' => 'X25519', 'kty' => 'OKP', 'x' => $agreementX]);
        $now = now()->timestamp;
        $ticket = $this->compact(
            ['typ' => 'ctx-key-release+jwt', 'alg' => 'EdDSA', 'kid' => 'provider-key-0001'],
            [
                'iss' => 'https://provider.example.test',
                'aud' => 'https://broker.example.test',
                'jti' => 'ticket-integration-0001',
                'iat' => $now,
                'nbf' => $now,
                'exp' => $now + 60,
                'ctx' => [
                    'version' => 1,
                    'capsule_id' => $this->request['capsule_id'],
                    'capsule_revision' => 1,
                    'policy_sha256' => str_repeat('p', 43),
                    'payload_id' => $this->request['payload_id'],
                    'release_handle' => $handle,
                    'action' => 'render',
                    'cryptographic_suite' => 'ctx-capsule-v1',
                    'proof_jkt' => $proofJkt,
                    'agreement_jkt' => $agreementJkt,
                ],
            ],
            sodium_crypto_sign_secretkey($ticketKeys),
        );
        $proof = $this->compact(
            [
                'typ' => 'ctx-key-release-proof+jwt',
                'alg' => 'EdDSA',
                'jwk' => ['kty' => 'OKP', 'crv' => 'Ed25519', 'x' => $proofX],
            ],
            [
                'jti' => 'proof-integration-0001',
                'htm' => 'POST',
                'htu' => 'https://broker.example.test/releases',
                'iat' => $now,
                'tth' => $this->encode(hash('sha256', $ticket, true)),
            ],
            sodium_crypto_sign_secretkey($proofKeys),
        );

        $prepared = app(PrepareKeyRelease::class)->prepare($ticket, $proof, $agreementX);
        $this->assertSame('ticket-integration-0001', $prepared->ticketJti);
        $this->assertSame(43, strlen($prepared->enc));
        $this->assertSame(64, strlen($prepared->ciphertext));

        $this->expectException(InvalidDeviceProof::class);
        app(PrepareKeyRelease::class)->prepare($ticket, $proof, $agreementX);
    }

    /** @param array<string, mixed> $header @param array<string, mixed> $claims */
    private function compact(array $header, array $claims, string $privateKey): string
    {
        $input = $this->encode(json_encode($header, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES))
            .'.'.$this->encode(json_encode($claims, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));

        return $input.'.'.$this->encode(sodium_crypto_sign_detached($input, $privateKey));
    }

    /** @param array<string, string> $jwk */
    private function thumbprint(array $jwk): string
    {
        return $this->encode(hash('sha256', (new CanonicalJson)->encode($jwk), true));
    }

    private function encode(string $value): string
    {
        return sodium_bin2base64($value, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }
}
