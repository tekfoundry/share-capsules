<?php

namespace App\Console\Commands;

use App\Showcase\ShowcaseCapsulePublisher;
use App\Showcase\ShowcaseConfiguration;
use App\Showcase\ShowcaseExamples;
use App\Showcase\ShowcaseGenerationFailed;
use Illuminate\Console\Command;

final class GenerateShowcaseCapsules extends Command
{
    protected $signature = 'showcase:generate-capsules
        {--example= : Generate one showcase example slug}
        {--force : Overwrite an existing generated Capsule output}
        {--dry-run : Show planned generation without creating broker records or files}';

    protected $description = 'Generate public showcase Capsule files through the internal Creator automation pipeline.';

    public function handle(): int
    {
        $configuration = ShowcaseConfiguration::fromConfig();
        $example = $this->option('example');
        if ($example !== null && (! is_string($example) || $example === '')) {
            $this->components->error('The --example option must be a non-empty showcase slug.');

            return self::INVALID;
        }

        $examples = $this->examples($example);
        if ($examples === []) {
            $this->components->error("Unknown showcase example [{$example}].");

            return self::INVALID;
        }

        if ($this->option('dry-run')) {
            $this->components->info('Showcase generation dry run.');
            $this->line('Generation enabled: '.($configuration->generationEnabled ? 'yes' : 'no'));
            $this->line("Owner email: {$configuration->ownerEmail}");
            $this->line('Owner verified: '.($configuration->ownerVerified ? 'yes' : 'no'));
            $this->line("Signing strategy: {$configuration->signingStrategy}");
            foreach ($examples as $planned) {
                $this->line(sprintf(
                    'Would generate %s: policy=%s source=%s output=%s expected="%s"',
                    $planned['slug'],
                    $planned['policy'],
                    ShowcaseExamples::imageUrlPath($planned['slug']),
                    ShowcaseExamples::capsuleUrlPath($planned['slug']),
                    $planned['expected'],
                ));
            }

            return self::SUCCESS;
        }

        $failed = 0;
        $publisher = app(ShowcaseCapsulePublisher::class);
        foreach ($examples as $planned) {
            try {
                $result = $publisher->generate(
                    $planned['slug'],
                    force: (bool) $this->option('force'),
                );
                $this->line(sprintf(
                    'Generated %s: policy=%s output=%s',
                    $result->slug,
                    $planned['policy'],
                    ShowcaseExamples::capsuleUrlPath($result->slug),
                ));
                $this->line("Evidence {$result->slug}: capsule_id={$result->capsuleId}");
                $this->line("Evidence {$result->slug}: registration_id={$result->registrationId}");
                $this->line('Evidence '.$result->slug.': release_handle='.($result->releaseHandle === '' ? 'no' : 'yes'));
                $this->line('Evidence '.$result->slug.': verified='.($result->verified ? 'yes' : 'no'));
                $this->line('Evidence '.$result->slug.': revoked='.($result->revoked ? 'yes' : 'no'));
            } catch (ShowcaseGenerationFailed $exception) {
                $failed++;
                $this->components->error("Failed {$planned['slug']}: {$exception->getMessage()}");
            }
        }

        if ($failed > 0) {
            $this->components->error("{$failed} showcase generation task(s) failed.");

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    /**
     * @return list<array{slug: string, title: string, image: string, capsule: string, policy: string, expected: string}>
     */
    private function examples(?string $slug): array
    {
        if ($slug === null) {
            return ShowcaseExamples::all();
        }

        return array_values(array_filter(
            ShowcaseExamples::all(),
            static fn (array $example): bool => $example['slug'] === $slug,
        ));
    }
}
