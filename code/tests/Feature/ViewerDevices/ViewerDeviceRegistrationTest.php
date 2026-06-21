<?php

namespace Tests\Feature\ViewerDevices;

use App\Models\User;
use App\ViewerDevices\OkpPublicKey;
use App\ViewerDevices\ViewerDeviceRegistrationMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Tests\TestCase;

final class ViewerDeviceRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private const DEVICE_ID = '01977ac8-793e-72d4-a234-bd581e773e7e';

    public function test_public_key_thumbprints_and_registration_message_are_stable(): void
    {
        $proof = OkpPublicKey::fromJwk([
            'kty' => 'OKP',
            'crv' => 'Ed25519',
            'x' => '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo',
        ], 'Ed25519', 'proof_key');
        $agreement = OkpPublicKey::fromJwk([
            'kty' => 'OKP',
            'crv' => 'X25519',
            'x' => 'sln27pLcugERhQsTs_bczIJ3JvmwgjWrYpIraz8_Khk',
        ], 'X25519', 'agreement_key');

        $this->assertSame('kPrK_qmxVWaYVA9wwBF6Iuo3vVzz7TxHCTwXBygrS4k', $proof->thumbprint);
        $this->assertSame('fvqyZUNdQpfZszVNMPPY5XYOUrc7YWHrq6afZ0Lba58', $agreement->thumbprint);
        $this->assertSame(
            "ctx-viewer-device-registration\n1.0\nchallenge_id:01977ac8-793e-72d4-a234-bd581e773e7d\ndevice_id:01977ac8-793e-72d4-a234-bd581e773e7e\nnonce:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nproof_jkt:kPrK_qmxVWaYVA9wwBF6Iuo3vVzz7TxHCTwXBygrS4k\nagreement_jkt:fvqyZUNdQpfZszVNMPPY5XYOUrc7YWHrq6afZ0Lba58\n",
            ViewerDeviceRegistrationMessage::build(
                '01977ac8-793e-72d4-a234-bd581e773e7d',
                self::DEVICE_ID,
                'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                $proof->thumbprint,
                $agreement->thumbprint,
            ),
        );
    }

    public function test_a_scoped_extension_token_can_register_distinct_proven_device_keys(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        Passport::actingAs($user, ['extension:connect']);
        $keys = $this->deviceKeys();

        $challenge = $this->postJson(route('api.viewer-devices.challenges.store'), [
            'device_id' => self::DEVICE_ID,
            'proof_key' => $keys['proof_jwk'],
            'agreement_key' => $keys['agreement_jwk'],
        ])->assertCreated()
            ->assertJsonPath('type', ViewerDeviceRegistrationMessage::TYPE)
            ->assertJsonPath('version', ViewerDeviceRegistrationMessage::VERSION)
            ->assertJsonPath('device_id', self::DEVICE_ID)
            ->json();

        $proofs = $this->answerChallenge($challenge, $keys);
        $response = $this->postJson(route('api.viewer-devices.store'), [
            'challenge_id' => $challenge['challenge_id'],
            'name' => 'Personal MacBook',
            ...$proofs,
        ]);

        $response->assertCreated()
            ->assertJsonPath('device.name', 'Personal MacBook')
            ->assertJsonPath('device.id', self::DEVICE_ID)
            ->assertJsonPath('device.status', 'active')
            ->assertJsonPath('device.proof_jkt', $challenge['proof_jkt'])
            ->assertJsonPath('device.agreement_jkt', $challenge['agreement_jkt']);
        $this->assertDatabaseHas('viewer_devices', [
            'user_id' => $user->getKey(),
            'proof_public_key' => $keys['proof_jwk']['x'],
            'agreement_public_key' => $keys['agreement_jwk']['x'],
            'status' => 'active',
        ]);
        $this->assertDatabaseMissing('viewer_device_challenges', [
            'id' => $challenge['challenge_id'],
            'consumed_at' => null,
        ]);
    }

    public function test_registration_requires_the_exact_extension_scope_and_verified_email(): void
    {
        $keys = $this->deviceKeys();
        $verified = User::factory()->create(['email_verified_at' => now()]);
        Passport::actingAs($verified, []);

        $this->postJson(route('api.viewer-devices.challenges.store'), [
            'device_id' => self::DEVICE_ID,
            'proof_key' => $keys['proof_jwk'],
            'agreement_key' => $keys['agreement_jwk'],
        ])->assertForbidden();

        $unverified = User::factory()->unverified()->create();
        Passport::actingAs($unverified, ['extension:connect']);

        $this->postJson(route('api.viewer-devices.challenges.store'), [
            'device_id' => self::DEVICE_ID,
            'proof_key' => $keys['proof_jwk'],
            'agreement_key' => $keys['agreement_jwk'],
        ])->assertForbidden();
    }

    public function test_malformed_private_extra_and_reused_key_material_are_rejected(): void
    {
        Passport::actingAs(
            User::factory()->create(['email_verified_at' => now()]),
            ['extension:connect'],
        );
        $keys = $this->deviceKeys();

        $this->postJson(route('api.viewer-devices.challenges.store'), [
            'device_id' => self::DEVICE_ID,
            'proof_key' => [...$keys['proof_jwk'], 'd' => str_repeat('a', 43)],
            'agreement_key' => $keys['agreement_jwk'],
        ])->assertUnprocessable()->assertJsonValidationErrors('proof_key');

        $this->postJson(route('api.viewer-devices.challenges.store'), [
            'device_id' => self::DEVICE_ID,
            'proof_key' => ['kty' => 'OKP', 'crv' => 'Ed25519', 'x' => 'not-a-key'],
            'agreement_key' => $keys['agreement_jwk'],
        ])->assertUnprocessable()->assertJsonValidationErrors('proof_key');

        $this->postJson(route('api.viewer-devices.challenges.store'), [
            'device_id' => self::DEVICE_ID,
            'proof_key' => $keys['proof_jwk'],
            'agreement_key' => [
                'kty' => 'OKP',
                'crv' => 'X25519',
                'x' => $keys['proof_jwk']['x'],
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors('agreement_key');
    }

    public function test_both_possession_proofs_are_required_and_a_challenge_is_single_use(): void
    {
        Passport::actingAs(
            User::factory()->create(['email_verified_at' => now()]),
            ['extension:connect'],
        );
        $keys = $this->deviceKeys();
        $challenge = $this->postJson(route('api.viewer-devices.challenges.store'), [
            'device_id' => self::DEVICE_ID,
            'proof_key' => $keys['proof_jwk'],
            'agreement_key' => $keys['agreement_jwk'],
        ])->assertCreated()->json();
        $proofs = $this->answerChallenge($challenge, $keys);

        $this->postJson(route('api.viewer-devices.store'), [
            'challenge_id' => $challenge['challenge_id'],
            'name' => 'Invalid proof',
            ...$proofs,
            'proof_signature' => $this->encode(random_bytes(64)),
        ])->assertUnprocessable()->assertJsonValidationErrors('proof_signature');

        $this->postJson(route('api.viewer-devices.store'), [
            'challenge_id' => $challenge['challenge_id'],
            'name' => 'Invalid agreement',
            ...$proofs,
            'agreement_confirmation' => $this->encode(random_bytes(32)),
        ])->assertUnprocessable()->assertJsonValidationErrors('agreement_confirmation');

        $payload = [
            'challenge_id' => $challenge['challenge_id'],
            'name' => 'Valid device',
            ...$proofs,
        ];
        $this->postJson(route('api.viewer-devices.store'), $payload)->assertCreated();
        $this->postJson(route('api.viewer-devices.store'), $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('challenge_id');
    }

    public function test_a_challenge_cannot_be_completed_by_another_account(): void
    {
        $owner = User::factory()->create(['email_verified_at' => now()]);
        $other = User::factory()->create(['email_verified_at' => now()]);
        $keys = $this->deviceKeys();
        Passport::actingAs($owner, ['extension:connect']);
        $challenge = $this->postJson(route('api.viewer-devices.challenges.store'), [
            'device_id' => self::DEVICE_ID,
            'proof_key' => $keys['proof_jwk'],
            'agreement_key' => $keys['agreement_jwk'],
        ])->assertCreated()->json();

        Passport::actingAs($other, ['extension:connect']);
        $this->postJson(route('api.viewer-devices.store'), [
            'challenge_id' => $challenge['challenge_id'],
            'name' => 'Stolen challenge',
            ...$this->answerChallenge($challenge, $keys),
        ])->assertUnprocessable()->assertJsonValidationErrors('challenge_id');
    }

    public function test_registered_key_material_cannot_be_attached_to_a_second_device(): void
    {
        Passport::actingAs(
            User::factory()->create(['email_verified_at' => now()]),
            ['extension:connect'],
        );
        $keys = $this->deviceKeys();
        $first = $this->postJson(route('api.viewer-devices.challenges.store'), [
            'device_id' => self::DEVICE_ID,
            'proof_key' => $keys['proof_jwk'],
            'agreement_key' => $keys['agreement_jwk'],
        ])->assertCreated()->json();
        $this->postJson(route('api.viewer-devices.store'), [
            'challenge_id' => $first['challenge_id'],
            'name' => 'First device',
            ...$this->answerChallenge($first, $keys),
        ])->assertCreated();

        $second = $this->postJson(route('api.viewer-devices.challenges.store'), [
            'device_id' => '01977ac8-793e-72d4-a234-bd581e773e7f',
            'proof_key' => $keys['proof_jwk'],
            'agreement_key' => $keys['agreement_jwk'],
        ])->assertCreated()->json();
        $this->postJson(route('api.viewer-devices.store'), [
            'challenge_id' => $second['challenge_id'],
            'name' => 'Duplicate device',
            ...$this->answerChallenge($second, $keys),
        ])->assertUnprocessable()->assertJsonValidationErrors('device');

        $this->assertDatabaseCount('viewer_devices', 1);
    }

    public function test_a_device_name_must_contain_visible_characters(): void
    {
        Passport::actingAs(
            User::factory()->create(['email_verified_at' => now()]),
            ['extension:connect'],
        );

        $this->postJson(route('api.viewer-devices.store'), [
            'challenge_id' => '01977ac8-793e-72d4-a234-bd581e773e7d',
            'name' => '   ',
            'proof_signature' => $this->encode(random_bytes(64)),
            'agreement_confirmation' => $this->encode(random_bytes(32)),
        ])->assertUnprocessable()->assertJsonValidationErrors('name');
    }

    /**
     * @return array{
     *   proof_jwk: array{kty: string, crv: string, x: string},
     *   proof_secret: string,
     *   agreement_jwk: array{kty: string, crv: string, x: string},
     *   agreement_secret: string
     * }
     */
    private function deviceKeys(): array
    {
        $proofPair = sodium_crypto_sign_keypair();
        $agreementSecret = random_bytes(32);

        return [
            'proof_jwk' => [
                'kty' => 'OKP',
                'crv' => 'Ed25519',
                'x' => $this->encode(sodium_crypto_sign_publickey($proofPair)),
            ],
            'proof_secret' => sodium_crypto_sign_secretkey($proofPair),
            'agreement_jwk' => [
                'kty' => 'OKP',
                'crv' => 'X25519',
                'x' => $this->encode(sodium_crypto_scalarmult_base($agreementSecret)),
            ],
            'agreement_secret' => $agreementSecret,
        ];
    }

    /**
     * @param  array<string, mixed>  $challenge
     * @param  array{proof_secret: string, agreement_secret: string}  $keys
     * @return array{proof_signature: string, agreement_confirmation: string}
     */
    private function answerChallenge(array $challenge, array $keys): array
    {
        $message = ViewerDeviceRegistrationMessage::build(
            $challenge['challenge_id'],
            $challenge['device_id'],
            $challenge['nonce'],
            $challenge['proof_jkt'],
            $challenge['agreement_jkt'],
        );
        $signature = sodium_crypto_sign_detached($message, $keys['proof_secret']);
        $sharedSecret = sodium_crypto_scalarmult(
            $keys['agreement_secret'],
            $this->decode($challenge['server_agreement_public_key']),
        );
        $confirmationKey = hash_hkdf(
            'sha256',
            $sharedSecret,
            32,
            'ctx-viewer-device-registration-agreement-v1',
            $this->decode($challenge['nonce']),
        );

        return [
            'proof_signature' => $this->encode($signature),
            'agreement_confirmation' => $this->encode(
                hash_hmac('sha256', $message, $confirmationKey, true),
            ),
        ];
    }

    private function encode(string $value): string
    {
        return sodium_bin2base64($value, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }

    private function decode(string $value): string
    {
        return sodium_base642bin($value, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }
}
