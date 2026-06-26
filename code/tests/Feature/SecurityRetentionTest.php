<?php

namespace Tests\Feature;

use App\Ctx\SigningKeys\TicketSigningKeyStatus;
use App\Models\BrokerDeviceProof;
use App\Models\BrokerRegistrationGrant;
use App\Models\CtxAuthorizationTicket;
use App\Models\CtxTicketSigningKey;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

final class SecurityRetentionTest extends TestCase
{
    use RefreshDatabase;

    public function test_expired_replay_artifacts_are_pruned_after_the_reviewed_twenty_four_hour_window(): void
    {
        $this->freezeTime();
        $this->configureBrokerProofStorage();
        [$user, $device, $kid] = $this->identity();
        $expired = now()->subDay()->subSecond();
        $fresh = now()->subDay()->addSecond();

        $this->ticket($user, $device, $kid, 'expired-ticket', $expired);
        $this->ticket($user, $device, $kid, 'fresh-ticket', $fresh);
        $this->grant($user, $device, 'expired-registration', $expired);
        $this->grant($user, $device, 'fresh-registration', $fresh);
        BrokerDeviceProof::query()->create([
            'jti' => 'expired-device-proof',
            'ticket_jti' => 'expired-ticket',
            'expires_at' => $expired,
        ]);
        BrokerDeviceProof::query()->create([
            'jti' => 'fresh-device-proof',
            'ticket_jti' => 'fresh-ticket',
            'expires_at' => $fresh,
        ]);

        Artisan::call('model:prune', ['--model' => CtxAuthorizationTicket::class]);
        Artisan::call('model:prune', ['--model' => BrokerRegistrationGrant::class]);
        Artisan::call('model:prune', ['--model' => BrokerDeviceProof::class]);

        $this->assertDatabaseMissing('ctx_authorization_tickets', ['jti' => 'expired-ticket']);
        $this->assertDatabaseHas('ctx_authorization_tickets', ['jti' => 'fresh-ticket']);
        $this->assertDatabaseMissing('broker_registration_grants', ['registration_id' => 'expired-registration']);
        $this->assertDatabaseHas('broker_registration_grants', ['registration_id' => 'fresh-registration']);
        $this->assertDatabaseMissing('broker_device_proofs', ['jti' => 'expired-device-proof'], 'broker');
        $this->assertDatabaseHas('broker_device_proofs', ['jti' => 'fresh-device-proof'], 'broker');
    }

    private function configureBrokerProofStorage(): void
    {
        config()->set('database.connections.broker', [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
            'foreign_key_constraints' => true,
        ]);
        DB::purge('broker');

        Schema::connection('broker')->create('broker_device_proofs', function (Blueprint $table): void {
            $table->string('jti', 128)->primary();
            $table->string('ticket_jti', 128)->index();
            $table->timestamp('expires_at')->index();
            $table->timestamps();
        });
    }

    /** @return array{User, ViewerDevice, string} */
    private function identity(): array
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $device = ViewerDevice::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->getKey(),
            'name' => 'Security retention device',
            'proof_public_key' => $this->key(),
            'proof_jkt' => $this->key(),
            'agreement_public_key' => $this->key(),
            'agreement_jkt' => $this->key(),
            'status' => ViewerDeviceStatus::Active,
        ]);
        $key = CtxTicketSigningKey::query()->create([
            'kid' => 'retention-key-000000000000000001',
            'public_key' => $this->key(),
            'encrypted_private_key' => 'retention-private-key',
            'status' => TicketSigningKeyStatus::Active,
            'published_at' => now(),
            'activated_at' => now(),
        ]);

        return [$user, $device, $key->kid];
    }

    private function ticket(
        User $user,
        ViewerDevice $device,
        string $kid,
        string $jti,
        \DateTimeInterface $expiresAt,
    ): void {
        CtxAuthorizationTicket::query()->create([
            'jti' => $jti,
            'user_id' => $user->getKey(),
            'viewer_device_id' => $device->getKey(),
            'signing_kid' => $kid,
            'ticket_sha256' => hash('sha256', $jti),
            'host_origin' => 'https://host.example.test',
            'broker' => 'https://broker.example.test',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'policy_sha256' => $this->key(),
            'payload_id' => 'primary',
            'release_handle' => 'release-'.$jti,
            'action' => 'render',
            'proof_jkt' => $device->proof_jkt,
            'agreement_jkt' => $device->agreement_jkt,
            'status' => 'pending',
            'issued_at' => now()->subDays(2),
            'expires_at' => $expiresAt,
        ]);
    }

    private function grant(
        User $user,
        ViewerDevice $device,
        string $registrationId,
        \DateTimeInterface $expiresAt,
    ): void {
        BrokerRegistrationGrant::query()->create([
            'token_hash' => hash('sha256', $registrationId),
            'user_id' => $user->getKey(),
            'viewer_device_id' => $device->getKey(),
            'registration_id' => $registrationId,
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'payload_id' => 'primary',
            'policy_sha256' => $this->key(),
            'content_key_sha256' => $this->key(),
            'expires_at' => $expiresAt,
        ]);
    }

    private function key(): string
    {
        return sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }
}
