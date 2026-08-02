<?php

namespace Tests\Unit\Showcase;

use App\Broker\Registration\RegisteredContentKey;
use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Ctx\Policy\CtxPolicyDigest;
use App\Models\BrokerRegistrationGrant;
use App\Models\CreatorCapsule;
use App\Showcase\ShowcaseCapsuleBridge;
use App\Showcase\ShowcaseCapsuleCompleteInput;
use App\Showcase\ShowcaseCapsuleCompleteResult;
use App\Showcase\ShowcaseCapsulePrepareInput;
use App\Showcase\ShowcaseCapsulePrepareResult;
use App\Showcase\ShowcaseCapsulePublisher;
use App\Showcase\ShowcaseContentKeyRegistration;
use App\Showcase\ShowcaseExamples;
use App\Showcase\ShowcaseGenerationFailed;
use App\Showcase\ShowcasePolicyFactory;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Tests\TestCase;

final class ShowcaseCapsulePublisherTest extends TestCase
{
    use RefreshDatabase;

    private ?string $originalCapsuleBytes = null;

    private ?string $originalRevokedCapsuleBytes = null;

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('showcase.generation.enabled', true);
        Config::set(
            'sharecapsules.broker.kms.local_master_key',
            'base64:'.base64_encode(str_repeat('t', 32)),
        );
        $this->app->instance(ShowcaseContentKeyRegistration::class, new FakeShowcaseContentKeyRegistration);
        $outputPath = ShowcaseExamples::capsulePath(ShowcaseExamples::OPEN_IMAGE);
        $this->originalCapsuleBytes = File::exists($outputPath) ? File::get($outputPath) : null;
        File::delete($outputPath);
        $revokedOutputPath = ShowcaseExamples::capsulePath(ShowcaseExamples::REVOKED);
        $this->originalRevokedCapsuleBytes = File::exists($revokedOutputPath) ? File::get($revokedOutputPath) : null;
        File::delete($revokedOutputPath);
    }

    protected function tearDown(): void
    {
        $outputPath = ShowcaseExamples::capsulePath(ShowcaseExamples::OPEN_IMAGE);
        File::delete($outputPath);
        if ($this->originalCapsuleBytes !== null) {
            File::put($outputPath, $this->originalCapsuleBytes);
        }
        $revokedOutputPath = ShowcaseExamples::capsulePath(ShowcaseExamples::REVOKED);
        File::delete($revokedOutputPath);
        if ($this->originalRevokedCapsuleBytes !== null) {
            File::put($revokedOutputPath, $this->originalRevokedCapsuleBytes);
        }

        parent::tearDown();
    }

    public function test_it_generates_through_pending_broker_and_finalize_lifecycle(): void
    {
        $now = CarbonImmutable::parse('2026-08-02T12:00:00Z');
        $bridge = new FakeShowcaseCapsuleBridge($this->policy($now));
        $this->app->instance(ShowcaseCapsuleBridge::class, $bridge);

        $result = app(ShowcaseCapsulePublisher::class)->generate(ShowcaseExamples::OPEN_IMAGE, now: $now);

        $this->assertSame(ShowcaseExamples::OPEN_IMAGE, $result->slug);
        $this->assertTrue(File::exists($result->outputPath));
        $this->assertSame('fake-capsule-archive', File::get($result->outputPath));
        $this->assertTrue($result->verified);
        $this->assertFalse($result->revoked);
        $this->assertSame(1, CreatorCapsule::query()->count());
        $capsule = CreatorCapsule::query()->firstOrFail();
        $this->assertSame(CapsuleLifecycleStatus::Active, $capsule->status);
        $this->assertSame($result->registrationId, $capsule->registration_id);
        $this->assertSame($result->releaseHandle, $capsule->release_handle);
        $this->assertDatabaseHas('users', ['email' => 'info@tekfoundry.com']);
        $this->assertDatabaseHas('viewer_devices', ['name' => 'Showcase automation']);
        $this->assertDatabaseHas('broker_registration_grants', [
            'registration_id' => $result->registrationId,
        ]);
    }

    public function test_it_refuses_to_overwrite_without_force(): void
    {
        File::put(ShowcaseExamples::capsulePath(ShowcaseExamples::OPEN_IMAGE), 'existing');

        $this->expectException(ShowcaseGenerationFailed::class);

        app(ShowcaseCapsulePublisher::class)->generate(ShowcaseExamples::OPEN_IMAGE);
    }

    public function test_it_cancels_registration_when_completion_fails(): void
    {
        $now = CarbonImmutable::parse('2026-08-02T12:00:00Z');
        $bridge = new FakeShowcaseCapsuleBridge($this->policy($now), failComplete: true);
        $this->app->instance(ShowcaseCapsuleBridge::class, $bridge);

        try {
            app(ShowcaseCapsulePublisher::class)->generate(ShowcaseExamples::OPEN_IMAGE, now: $now);
            $this->fail('The fake bridge should fail completion.');
        } catch (ShowcaseGenerationFailed) {
            $capsule = CreatorCapsule::query()->firstOrFail();
            $this->assertSame(CapsuleLifecycleStatus::Destroyed, $capsule->status);
            $this->assertFalse(File::exists(ShowcaseExamples::capsulePath(ShowcaseExamples::OPEN_IMAGE)));
        }
    }

    public function test_revoked_example_is_revoked_after_archive_is_written(): void
    {
        $now = CarbonImmutable::parse('2026-08-02T12:00:00Z');
        $bridge = new FakeShowcaseCapsuleBridge($this->policy($now, ShowcaseExamples::REVOKED));
        $this->app->instance(ShowcaseCapsuleBridge::class, $bridge);

        $result = app(ShowcaseCapsulePublisher::class)->generate(ShowcaseExamples::REVOKED, now: $now);

        $this->assertTrue($result->revoked);
        $this->assertTrue(File::exists($result->outputPath));
        $capsule = CreatorCapsule::query()->where('registration_id', $result->registrationId)->firstOrFail();
        $this->assertSame(CapsuleLifecycleStatus::Revoked, $capsule->status);
    }

    /** @return array<string, mixed> */
    private function policy(CarbonImmutable $now, string $slug = ShowcaseExamples::OPEN_IMAGE): array
    {
        return app(ShowcasePolicyFactory::class)->policyFor($slug, $now);
    }
}

final class FakeShowcaseContentKeyRegistration implements ShowcaseContentKeyRegistration
{
    /** @var list<array{registration_id: string, content_key_bytes: int}> */
    public array $registrations = [];

    public function register(
        string $grant,
        string $registrationId,
        string $capsuleId,
        string $payloadId,
        string $contentKeyBytes,
    ): RegisteredContentKey {
        $stored = BrokerRegistrationGrant::query()
            ->where('registration_id', $registrationId)
            ->where('capsule_id', $capsuleId)
            ->where('payload_id', $payloadId)
            ->where('content_key_sha256', sodium_bin2base64(
                hash('sha256', $contentKeyBytes, true),
                SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
            ))
            ->firstOrFail();

        $this->registrations[] = [
            'registration_id' => $stored->registration_id,
            'content_key_bytes' => strlen($contentKeyBytes),
        ];

        return new RegisteredContentKey(str_repeat('r', 43), true);
    }
}

final class FakeShowcaseCapsuleBridge implements ShowcaseCapsuleBridge
{
    public readonly string $contentKey;

    /** @param array<string, mixed> $policy */
    public function __construct(
        private readonly array $policy,
        private readonly bool $failComplete = false,
    ) {
        $this->contentKey = str_repeat('k', 32);
    }

    public function prepare(ShowcaseCapsulePrepareInput $input): ShowcaseCapsulePrepareResult
    {
        File::put($input->statePath, '{}');
        File::put(
            $input->contentKeyPath,
            sodium_bin2base64($this->contentKey, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING),
        );

        return new ShowcaseCapsulePrepareResult(
            registrationId: 'registration_'.bin2hex(random_bytes(16)),
            capsuleId: 'urn:uuid:'.(string) Str::uuid(),
            capsuleRevision: 1,
            payloadId: 'primary',
            policySha256: (new CtxPolicyDigest)->calculate($this->policy),
            policy: $this->policy,
            title: 'Open Capsule',
            contentProfileId: 'ctx.static-image',
            contentProfileVersion: '1.0',
            mediaType: 'image/jpeg',
            contentKeySha256: sodium_bin2base64(
                hash('sha256', $this->contentKey, true),
                SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
            ),
            metadata: [
                'width' => 640,
                'height' => 640,
                'media_type' => 'image/jpeg',
                'encoded_bytes' => 1024,
            ],
        );
    }

    public function complete(ShowcaseCapsuleCompleteInput $input): ShowcaseCapsuleCompleteResult
    {
        if ($this->failComplete) {
            throw new ShowcaseGenerationFailed('Completion failed.');
        }

        File::put($input->archivePath, 'fake-capsule-archive');

        return new ShowcaseCapsuleCompleteResult(
            archiveSha256: sodium_bin2base64(
                hash('sha256', 'fake-capsule-archive', true),
                SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
            ),
            archiveBytes: strlen('fake-capsule-archive'),
            verified: true,
        );
    }
}
