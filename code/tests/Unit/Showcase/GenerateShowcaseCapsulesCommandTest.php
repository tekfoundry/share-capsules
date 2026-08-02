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
use App\Showcase\ShowcaseManifestPublisher;
use App\Showcase\ShowcasePolicyFactory;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Tests\TestCase;

final class GenerateShowcaseCapsulesCommandTest extends TestCase
{
    use RefreshDatabase;

    /** @var array<string, string|null> */
    private array $originalCapsuleBytes = [];

    private ?string $originalManifestBytes = null;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (ShowcaseExamples::all() as $example) {
            $outputPath = ShowcaseExamples::capsulePath($example['slug']);
            $this->originalCapsuleBytes[$outputPath] = File::exists($outputPath) ? File::get($outputPath) : null;
            File::delete($outputPath);
        }
        $manifestPath = public_path(ltrim(ShowcaseManifestPublisher::URL_PATH, '/'));
        $this->originalManifestBytes = File::exists($manifestPath) ? File::get($manifestPath) : null;
        File::delete($manifestPath);
    }

    protected function tearDown(): void
    {
        foreach ($this->originalCapsuleBytes as $outputPath => $bytes) {
            File::delete($outputPath);
            if ($bytes !== null) {
                File::put($outputPath, $bytes);
            }
        }
        $manifestPath = public_path(ltrim(ShowcaseManifestPublisher::URL_PATH, '/'));
        File::delete($manifestPath);
        if ($this->originalManifestBytes !== null) {
            File::put($manifestPath, $this->originalManifestBytes);
        }
        CarbonImmutable::setTestNow();

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
        $this->assertFalse(File::exists(public_path(ltrim(ShowcaseManifestPublisher::URL_PATH, '/'))));
    }

    public function test_full_generation_emits_showcase_manifest_with_matching_policy_metadata(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-08-01T12:34:56Z'));
        Config::set('showcase.generation.enabled', true);
        $this->app->instance(ShowcaseCapsuleBridge::class, new CommandFakeShowcaseCapsuleBridge);
        $this->app->instance(ShowcaseContentKeyRegistration::class, new CommandFakeShowcaseContentKeyRegistration);

        $this->artisan('showcase:generate-capsules')
            ->expectsOutputToContain('Generated showcase manifest: /showcase/showcase-manifest.json')
            ->expectsOutputToContain('Evidence manifest: generated_at=2026-08-01T12:34:56Z')
            ->assertSuccessful();

        $manifestPath = public_path(ltrim(ShowcaseManifestPublisher::URL_PATH, '/'));
        $this->assertTrue(File::exists($manifestPath));

        $manifest = json_decode(File::get($manifestPath), true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame('share-capsules-showcase-manifest', $manifest['type']);
        $this->assertSame(1, $manifest['version']);
        $this->assertSame('2026-08-01T12:34:56Z', $manifest['generated_at']);
        $this->assertSame('2026-08-03T12:34:56Z', $manifest['examples']['time-future']['access_window']['not_before']);
        $this->assertSame('2026-07-31T12:34:56Z', $manifest['examples']['time-open']['access_window']['not_before']);
        $this->assertSame('2026-08-03T12:34:56Z', $manifest['examples']['time-open']['access_window']['not_after']);
        $this->assertSame('2026-07-30T12:34:56Z', $manifest['examples']['time-expired']['access_window']['not_after']);
        $this->assertSame(1000, $manifest['examples']['limit']['capsule_lifetime_maximum']);
        $this->assertTrue($manifest['examples']['trust']['automation_risk_required']);
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
        private readonly ?array $policy = null,
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
            policySha256: (new CtxPolicyDigest)->calculate($this->policyFor($input)),
            policy: $this->policyFor($input),
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

    /** @return array<string, mixed> */
    private function policyFor(ShowcaseCapsulePrepareInput $input): array
    {
        return $this->policy ?? app(ShowcasePolicyFactory::class)->policyFor(
            $input->slug,
            CarbonImmutable::now('UTC')->startOfSecond(),
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

        return new RegisteredContentKey(
            sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING),
            true,
        );
    }
}
