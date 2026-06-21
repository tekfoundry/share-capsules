<?php

namespace Tests\Feature\Broker;

use App\Broker\Registration\GrantSecretSource;
use App\Broker\Registration\RegistrationGrantService;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

final class RegistrationGrantCallbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_broker_callback_requires_its_credential_and_redeems_exact_bindings(): void
    {
        config()->set('sharecapsules.broker.callback_token', 'test-broker-callback-token-0001-safe');
        $this->app->instance(GrantSecretSource::class, new class implements GrantSecretSource
        {
            public function secret(): string
            {
                return str_repeat('g', 43);
            }
        });
        $user = User::factory()->create();
        $device = $this->device($user);
        app(RegistrationGrantService::class)->issue(
            $user,
            $device,
            'registration_0000000001',
            'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            1,
            'primary-image',
            str_repeat('p', 43),
            str_repeat('h', 43),
        );
        $request = [
            'grant' => str_repeat('g', 43),
            'registration_id' => 'registration_0000000001',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'payload_id' => 'primary-image',
            'content_key_sha256' => str_repeat('h', 43),
        ];

        $this->postJson('/internal/broker/registration-grants/redeem', $request)
            ->assertUnauthorized()
            ->assertExactJson(['error' => 'invalid_broker_credential']);
        $this->withToken('test-broker-callback-token-0001-safe')
            ->postJson('/internal/broker/registration-grants/redeem', $request)
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertExactJson([
                'type' => 'broker-registration-principal',
                'version' => 1,
                'creator_id' => (string) $user->getKey(),
                'capsule_revision' => 1,
                'policy_sha256' => str_repeat('p', 43),
            ]);
    }

    private function device(User $user): ViewerDevice
    {
        return ViewerDevice::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'name' => 'Creator device',
            'proof_public_key' => $this->key(),
            'proof_jkt' => $this->key(),
            'agreement_public_key' => $this->key(),
            'agreement_jkt' => $this->key(),
            'status' => ViewerDeviceStatus::Active,
        ]);
    }

    private function key(): string
    {
        return sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }
}
