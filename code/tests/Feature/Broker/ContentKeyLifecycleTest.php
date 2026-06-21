<?php

namespace Tests\Feature\Broker;

use App\Broker\Audit\BrokerAuditSink;
use App\Broker\Lifecycle\BrokerContentKeyStatus;
use App\Broker\Release\FinalContentKeyReleaseCheck;
use App\Models\BrokerContentKey;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
use Tests\BrokerTestCase;

#[RunTestsInSeparateProcesses]
#[PreserveGlobalState(false)]
final class ContentKeyLifecycleTest extends BrokerTestCase
{
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
            $table->string('protection_algorithm', 64)->nullable();
            $table->string('protection_key_id', 128)->nullable();
            $table->string('protection_nonce', 64)->nullable();
            $table->text('protected_content_key')->nullable();
            $table->string('status', 16);
            $table->timestamp('paused_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('destroyed_at')->nullable();
            $table->timestamps();
        });
        $this->app->instance(BrokerAuditSink::class, new class implements BrokerAuditSink
        {
            public function record(string $event, array $context = []): void {}
        });
        $this->key('record-one', 'registration-one', 'handle-one', '42', $this->capsule(1), 1);
        $this->key('record-two', 'registration-two', 'handle-two', '42', $this->capsule(2), 2);
        $this->key('record-other', 'registration-other', 'handle-other', '99', $this->capsule(3), 1);
    }

    public function test_pause_and_resume_are_idempotent_and_scoped_to_the_creator(): void
    {
        $this->apply(['operation' => 'pause_creator', 'creator_id' => '42'])
            ->assertOk()->assertJsonPath('changed_records', 2);
        $this->apply(['operation' => 'pause_creator', 'creator_id' => '42'])
            ->assertOk()->assertJsonPath('changed_records', 0);
        $this->assertSame(2, BrokerContentKey::query()->where('status', 'paused')->count());
        $this->assertSame(BrokerContentKeyStatus::Active, BrokerContentKey::query()->findOrFail('record-other')->status);

        $this->apply(['operation' => 'resume_creator', 'creator_id' => '42'])
            ->assertOk()->assertJsonPath('changed_records', 2);
        $this->assertSame(3, BrokerContentKey::query()->where('status', 'active')->count());
    }

    public function test_capsule_revocation_is_irreversible_and_cannot_be_undone_by_restore(): void
    {
        $record = BrokerContentKey::query()->findOrFail('record-one');
        $this->apply([
            'operation' => 'revoke_capsule',
            'creator_id' => '42',
            'capsule_id' => $record->capsule_id,
            'capsule_revision' => 1,
        ])->assertOk()->assertJsonPath('changed_records', 1);
        $this->assertSame(BrokerContentKeyStatus::Revoked, $record->fresh()->status);
        $this->assertNotNull($record->fresh()->revoked_at);
        $this->assertFalse(app(FinalContentKeyReleaseCheck::class)->active($record->record_id));

        $this->apply(['operation' => 'resume_creator', 'creator_id' => '42'])
            ->assertOk()->assertJsonPath('changed_records', 0);
        $this->assertSame(BrokerContentKeyStatus::Revoked, $record->fresh()->status);
    }

    public function test_permanent_deletion_destroys_key_material_and_removes_the_account_link(): void
    {
        $this->apply(['operation' => 'destroy_creator', 'creator_id' => '42'])
            ->assertOk()->assertJsonPath('changed_records', 2);
        $this->apply(['operation' => 'destroy_creator', 'creator_id' => '42'])
            ->assertOk()->assertJsonPath('changed_records', 0);

        foreach (BrokerContentKey::query()->whereIn('record_id', ['record-one', 'record-two'])->get() as $record) {
            $this->assertSame(BrokerContentKeyStatus::Destroyed, $record->status);
            $this->assertNull($record->creator_id);
            $this->assertNull($record->protection_algorithm);
            $this->assertNull($record->protection_key_id);
            $this->assertNull($record->protection_nonce);
            $this->assertNull($record->protected_content_key);
            $this->assertNotNull($record->destroyed_at);
        }
        $this->assertSame(BrokerContentKeyStatus::Active, BrokerContentKey::query()->findOrFail('record-other')->status);
    }

    public function test_lifecycle_endpoint_requires_authentication_and_an_exact_operation_shape(): void
    {
        $this->postJson('/internal/content-keys/lifecycle', [
            'operation' => 'pause_creator',
            'creator_id' => '42',
        ])->assertUnauthorized();
        $this->apply([
            'operation' => 'pause_creator',
            'creator_id' => '42',
            'capsule_id' => $this->capsule(1),
        ])->assertUnprocessable();
        $this->apply([
            'operation' => 'revoke_capsule',
            'creator_id' => '42',
        ])->assertUnprocessable();
    }

    /** @param array<string, string|int> $body */
    private function apply(array $body): TestResponse
    {
        return $this->withToken('test-broker-control-plane-token-0001')
            ->postJson('/internal/content-keys/lifecycle', $body);
    }

    private function key(
        string $recordId,
        string $registrationId,
        string $releaseHandle,
        string $creatorId,
        string $capsuleId,
        int $revision,
    ): void {
        BrokerContentKey::query()->create([
            'record_id' => $recordId,
            'registration_id' => $registrationId,
            'release_handle' => $releaseHandle,
            'creator_id' => $creatorId,
            'capsule_id' => $capsuleId,
            'capsule_revision' => $revision,
            'payload_id' => 'primary-image',
            'policy_sha256' => str_repeat('p', 43),
            'content_key_sha256' => str_repeat('k', 43),
            'protection_algorithm' => 'local-aes-256-gcm-v1',
            'protection_key_id' => 'local-test-key',
            'protection_nonce' => str_repeat('n', 16),
            'protected_content_key' => 'protected-secret-material',
            'status' => 'active',
        ]);
    }

    private function capsule(int $suffix): string
    {
        return sprintf('urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db70%d', $suffix);
    }
}
