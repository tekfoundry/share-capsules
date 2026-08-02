<?php

namespace Tests\Unit\Showcase;

use App\Broker\Registration\RegisteredContentKey;
use App\Ctx\Policy\CtxPolicyDigest;
use App\Models\BrokerRegistrationGrant;
use App\Models\CreatorCapsule;
use App\Showcase\ShowcaseCapsuleBridge;
use App\Showcase\ShowcaseCapsuleCompleteInput;
use App\Showcase\ShowcaseCapsuleCompleteResult;
use App\Showcase\ShowcaseCapsulePrepareInput;
use App\Showcase\ShowcaseCapsulePrepareResult;
use App\Showcase\ShowcaseContentKeyRegistration;
use App\Showcase\ShowcaseExamples;
use App\Showcase\ShowcaseGenerationFailed;
use App\Showcase\ShowcasePolicyFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Tests\TestCase;

final class GenerateShowcaseCapsulesCommandTest extends TestCase
{
    use RefreshDatabase;

    private ?string $originalCapsuleBytes = null;

    private ?string $originalRevokedCapsuleBytes = null;

    protected function setUp(): void
    {
        parent::setUp();

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

    public function test_dry_run_reports_planned_examples_without_enabling_generation(): void
    {
        Config::set('showcase.generation.enabled', false);

        $this->artisan('showcase:generate-capsules', ['--dry-run' => true, '--example' => ShowcaseExamples::OPEN_IMAGE])
            ->expectsOutputToContain('Showcase generation dry run.')
            ->expectsOutputToContain('Generation enabled: no')
            ->expectsOutputToContain('Owner email: info@tekfoundry.com')
            ->expectsOutputToContain('Would generate open-image')
            ->assertSuccessful();

        $this->assertSame(0, CreatorCapsule::query()->count());
        $this->assertFalse(File::exists(ShowcaseExamples::capsulePath(ShowcaseExamples::OPEN_IMAGE)));
    }

    public function test_unknown_example_is_invalid(): void
    {
        $this->artisan('showcase:generate-capsules', ['--example' => 'missing-example'])
            ->expectsOutputToContain('Unknown showcase example [missing-example].')
            ->assertExitCode(2);
    }

    public function test_it_generates_one_named_example_and_emits_sanitized_evidence(): void
    {
        Config::set('showcase.generation.enabled', true);
        $this->app->instance(ShowcaseCapsuleBridge::class, new CommandFakeShowcaseCapsuleBridge(
            app(ShowcasePolicyFactory::class)->policyFor(ShowcaseExamples::OPEN_IMAGE),
        ));
        $this->app->instance(ShowcaseContentKeyRegistration::class, new CommandFakeShowcaseContentKeyRegistration);

        $this->artisan('showcase:generate-capsules', ['--example' => ShowcaseExamples::OPEN_IMAGE])
            ->expectsOutputToContain('Generated open-image: policy=open output=/showcase/capsules/open-image-r1.capsule')
            ->expectsOutputToContain('release_handle=')
            ->expectsOutputToContain('verified=yes')
            ->expectsOutputToContain('revoked=no')
            ->assertSuccessful();

        $this->assertSame(1, CreatorCapsule::query()->count());
        $this->assertSame('fake-command-capsule', File::get(ShowcaseExamples::capsulePath(ShowcaseExamples::OPEN_IMAGE)));
    }

    public function test_generation_failures_return_failure(): void
    {
        Config::set('showcase.generation.enabled', true);
        $this->app->instance(ShowcaseCapsuleBridge::class, new CommandFakeShowcaseCapsuleBridge(
            app(ShowcasePolicyFactory::class)->policyFor(ShowcaseExamples::OPEN_IMAGE),
            failComplete: true,
        ));
        $this->app->instance(ShowcaseContentKeyRegistration::class, new CommandFakeShowcaseContentKeyRegistration);

        $this->artisan('showcase:generate-capsules', ['--example' => ShowcaseExamples::OPEN_IMAGE])
            ->expectsOutputToContain('Failed open-image: Completion failed.')
            ->expectsOutputToContain('1 showcase generation task(s) failed.')
            ->assertFailed();

        $this->assertFalse(File::exists(ShowcaseExamples::capsulePath(ShowcaseExamples::OPEN_IMAGE)));
    }

    public function test_revoked_example_emits_revoked_evidence(): void
    {
        Config::set('showcase.generation.enabled', true);
        $this->app->instance(ShowcaseCapsuleBridge::class, new CommandFakeShowcaseCapsuleBridge(
            app(ShowcasePolicyFactory::class)->policyFor(ShowcaseExamples::REVOKED),
        ));
        $this->app->instance(ShowcaseContentKeyRegistration::class, new CommandFakeShowcaseContentKeyRegistration);

        $this->artisan('showcase:generate-capsules', ['--example' => ShowcaseExamples::REVOKED])
            ->expectsOutputToContain('Generated revoked: policy=revoked output=/showcase/capsules/revoked-r1.capsule')
            ->expectsOutputToContain('revoked=yes')
            ->assertSuccessful();
    }
}

final class CommandFakeShowcaseCapsuleBridge implements ShowcaseCapsuleBridge
{
    private readonly string $contentKey;

    /** @param array<string, mixed> $policy */
    public function __construct(
        private readonly array $policy,
        private readonly bool $failComplete = false,
    ) {
        $this->contentKey = str_repeat('c', 32);
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

        File::put($input->archivePath, 'fake-command-capsule');

        return new ShowcaseCapsuleCompleteResult(
            archiveSha256: sodium_bin2base64(
                hash('sha256', 'fake-command-capsule', true),
                SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
            ),
            archiveBytes: strlen('fake-command-capsule'),
            verified: true,
        );
    }
}

final class CommandFakeShowcaseContentKeyRegistration implements ShowcaseContentKeyRegistration
{
    public function register(
        string $grant,
        string $registrationId,
        string $capsuleId,
        string $payloadId,
        string $contentKeyBytes,
    ): RegisteredContentKey {
        BrokerRegistrationGrant::query()
            ->where('registration_id', $registrationId)
            ->where('capsule_id', $capsuleId)
            ->where('payload_id', $payloadId)
            ->where('content_key_sha256', sodium_bin2base64(
                hash('sha256', $contentKeyBytes, true),
                SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
            ))
            ->firstOrFail();

        return new RegisteredContentKey(str_repeat('s', 43), true);
    }
}
