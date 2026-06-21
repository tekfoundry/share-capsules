<?php

namespace Tests\Unit\Broker;

use App\Broker\Registration\GrantSecretSource;
use App\Broker\Registration\InvalidRegistrationGrant;
use App\Broker\Registration\RegistrationGrantService;
use App\Models\BrokerRegistrationGrant;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

final class RegistrationGrantServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_stores_only_a_hash_and_redeems_an_exact_bound_grant_idempotently(): void
    {
        [$user, $device] = $this->userAndDevice();
        $secret = str_repeat('s', 43);
        $service = new RegistrationGrantService(new class($secret) implements GrantSecretSource
        {
            public function __construct(private readonly string $value) {}

            public function secret(): string
            {
                return $this->value;
            }
        });
        $now = CarbonImmutable::parse('2026-06-21T12:00:00Z');

        $issued = $service->issue(
            $user,
            $device,
            'registration_0000000001',
            'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            1,
            'primary-image',
            str_repeat('p', 43),
            str_repeat('h', 43),
            $now,
        );

        $this->assertSame($secret, $issued->token);
        $stored = BrokerRegistrationGrant::query()->sole();
        $this->assertSame(hash('sha256', $secret), $stored->token_hash);
        $this->assertStringNotContainsString($secret, json_encode($stored->toArray(), JSON_THROW_ON_ERROR));

        foreach ([1, 2] as $attempt) {
            $principal = $service->redeem(
                $secret,
                'registration_0000000001',
                'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
                'primary-image',
                str_repeat('h', 43),
                $now->addSecond(),
            );
            $this->assertSame((string) $user->getKey(), $principal->creatorId, (string) $attempt);
        }
    }

    public function test_it_rejects_expired_or_mismatched_grants(): void
    {
        [$user, $device] = $this->userAndDevice();
        $service = new RegistrationGrantService(new class implements GrantSecretSource
        {
            public function secret(): string
            {
                return str_repeat('s', 43);
            }
        });
        $now = CarbonImmutable::parse('2026-06-21T12:00:00Z');
        $service->issue(
            $user,
            $device,
            'registration_0000000001',
            'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            1,
            'primary-image',
            str_repeat('p', 43),
            str_repeat('h', 43),
            $now,
        );

        $this->expectException(InvalidRegistrationGrant::class);
        $service->redeem(
            str_repeat('s', 43),
            'registration_0000000001',
            'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'different-payload',
            str_repeat('h', 43),
            $now->addSeconds(61),
        );
    }

    /** @return array{User, ViewerDevice} */
    private function userAndDevice(): array
    {
        $user = User::factory()->create();
        $device = ViewerDevice::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'name' => 'Creator device',
            'proof_public_key' => $this->key(),
            'proof_jkt' => $this->key(),
            'agreement_public_key' => $this->key(),
            'agreement_jkt' => $this->key(),
            'status' => ViewerDeviceStatus::Active,
        ]);

        return [$user, $device];
    }

    private function key(): string
    {
        return sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }
}
