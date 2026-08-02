<?php

namespace App\Showcase;

use App\Broker\Lifecycle\CapsuleRevocationService;
use App\Broker\Registration\RegistrationGrantService;
use App\Capsules\Registry\CapsuleRegistrationLifecycle;
use App\Capsules\Registry\CapsuleRegistry;
use App\Capsules\Registry\PendingCapsuleRegistration;
use App\Ctx\Policy\CtxPolicyDigest;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Throwable;

final readonly class ShowcaseCapsulePublisher
{
    public function __construct(
        private ShowcaseCapsuleBridge $bridge,
        private ShowcasePolicyFactory $policies,
        private ShowcaseAutomationIdentityResolver $identity,
        private CapsuleRegistry $registry,
        private RegistrationGrantService $grants,
        private ShowcaseContentKeyRegistration $contentKeys,
        private CapsuleRegistrationLifecycle $lifecycle,
        private CapsuleRevocationService $revocation,
    ) {}

    public function generate(string $slug, bool $force = false, ?CarbonImmutable $now = null): ShowcaseGenerationResult
    {
        $now ??= CarbonImmutable::now('UTC');
        $configuration = ShowcaseConfiguration::fromConfig();
        if (! $configuration->generationEnabled) {
            throw new ShowcaseGenerationFailed('Showcase generation is disabled.');
        }

        $example = ShowcaseExamples::get($slug);
        $sourcePath = ShowcaseExamples::imagePath($slug);
        $outputPath = ShowcaseExamples::capsulePath($slug);
        if (! File::exists($sourcePath)) {
            throw new ShowcaseGenerationFailed("Showcase source image [{$sourcePath}] does not exist.");
        }
        if (File::exists($outputPath) && ! ($force || $configuration->overwriteExistingCapsules)) {
            throw new ShowcaseGenerationFailed("Showcase Capsule output [{$outputPath}] already exists.");
        }

        $workspace = storage_path('app/showcase-generation/'.(string) Str::uuid());
        $statePath = "{$workspace}/state.json";
        $contentKeyPath = "{$workspace}/content-key.b64u";
        $archivePath = "{$workspace}/generated.capsule";
        File::ensureDirectoryExists($workspace, 0700, true);

        $registered = false;
        $registrationId = null;
        try {
            $prepare = $this->bridge->prepare(new ShowcaseCapsulePrepareInput(
                slug: $slug,
                title: $example['title'],
                description: $example['expected'],
                draftPolicy: $this->policies->draftPolicyFor($slug, $now),
                sourcePath: $sourcePath,
                statePath: $statePath,
                contentKeyPath: $contentKeyPath,
                ctxIssuer: (string) config('sharecapsules.ctx.issuer'),
                automationRiskIssuer: (string) config('sharecapsules.ctx.issuer'),
            ));
            $registrationId = $prepare->registrationId;
            $expectedPolicy = $this->policies->policyFor($slug, $now);
            $expectedDigest = (new CtxPolicyDigest)->calculate($expectedPolicy);
            if ($prepare->policy !== $expectedPolicy || $prepare->policySha256 !== $expectedDigest) {
                throw new ShowcaseGenerationFailed('Showcase policy drift detected between PHP config and Creator bridge.');
            }

            $automation = $this->identity->resolve($configuration);
            $this->registry->createPending($automation->owner, PendingCapsuleRegistration::fromValues(
                $prepare->registrationId,
                $prepare->capsuleId,
                $prepare->capsuleRevision,
                $prepare->payloadId,
                (string) config('sharecapsules.broker.base_url'),
                $prepare->policySha256,
                $prepare->policy,
                $prepare->title,
                $prepare->contentProfileId,
                $prepare->contentProfileVersion,
                $prepare->mediaType,
            ), $now);
            $registered = true;

            $grant = $this->grants->issue(
                $automation->owner,
                $automation->device,
                $prepare->registrationId,
                $prepare->capsuleId,
                $prepare->capsuleRevision,
                $prepare->payloadId,
                $prepare->policySha256,
                $prepare->contentKeySha256,
                $now,
            );
            $contentKeyBytes = $this->readContentKey($contentKeyPath);
            $brokerRegistration = $this->contentKeys->register(
                $grant->token,
                $prepare->registrationId,
                $prepare->capsuleId,
                $prepare->payloadId,
                $contentKeyBytes,
            );
            sodium_memzero($contentKeyBytes);

            $capsule = $this->lifecycle->finalize(
                $automation->owner,
                $prepare->registrationId,
                $brokerRegistration->releaseHandle,
                $now,
            );
            $complete = $this->bridge->complete(new ShowcaseCapsuleCompleteInput(
                statePath: $statePath,
                archivePath: $archivePath,
                releaseHandle: $brokerRegistration->releaseHandle,
                broker: (string) config('sharecapsules.broker.base_url'),
            ));
            File::ensureDirectoryExists(dirname($outputPath), 0755, true);
            if (File::exists($outputPath)) {
                File::delete($outputPath);
            }
            File::move($archivePath, $outputPath);
            $revoked = false;
            if ($slug === ShowcaseExamples::REVOKED) {
                $this->revocation->revoke($automation->owner, $capsule->capsule_id, $capsule->capsule_revision);
                $revoked = true;
            }

            return new ShowcaseGenerationResult(
                slug: $slug,
                outputPath: $outputPath,
                capsuleId: $capsule->capsule_id,
                registrationId: $capsule->registration_id,
                releaseHandle: $brokerRegistration->releaseHandle,
                archiveSha256: $complete->archiveSha256,
                archiveBytes: $complete->archiveBytes,
                verified: $complete->verified,
                revoked: $revoked,
            );
        } catch (Throwable $exception) {
            if ($registered && is_string($registrationId)) {
                try {
                    $automation ??= $this->identity->resolve($configuration);
                    $this->lifecycle->cancel($automation->owner, $registrationId);
                } catch (Throwable) {
                    // Pending or finalized registrations remain retryable through existing cleanup paths.
                }
            }

            throw $exception instanceof ShowcaseGenerationFailed
                ? $exception
                : new ShowcaseGenerationFailed(
                    'Showcase generation failed: '.$exception->getMessage(),
                    previous: $exception,
                );
        } finally {
            if (File::exists($contentKeyPath)) {
                File::put($contentKeyPath, '');
                File::delete($contentKeyPath);
            }
            if (File::exists($workspace)) {
                File::deleteDirectory($workspace);
            }
        }
    }

    private function readContentKey(string $path): string
    {
        if (! File::exists($path)) {
            throw new ShowcaseGenerationFailed('Showcase bridge did not write a content key file.');
        }
        $encoded = trim((string) File::get($path));
        try {
            return sodium_base642bin($encoded, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
        } catch (Throwable $exception) {
            throw new ShowcaseGenerationFailed('Showcase bridge wrote an invalid content key file.', previous: $exception);
        }
    }
}
