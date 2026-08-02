<?php

namespace App\Showcase;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\File;
use JsonException;

final readonly class ShowcaseManifestPublisher
{
    public const URL_PATH = '/showcase/showcase-manifest.json';

    public function __construct(private ShowcasePolicyFactory $policies) {}

    /**
     * @param  list<array{slug: string, title: string, image: string, capsule: string, policy: string, expected: string}>  $examples
     *
     * @throws JsonException
     */
    public function publish(array $examples, CarbonImmutable $generatedAt): string
    {
        $path = public_path(ltrim(self::URL_PATH, '/'));
        File::ensureDirectoryExists(dirname($path), 0755, true);

        File::put($path, json_encode(
            $this->manifest($examples, $generatedAt),
            JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR,
        )."\n");

        return $path;
    }

    /**
     * @param  list<array{slug: string, title: string, image: string, capsule: string, policy: string, expected: string}>  $examples
     * @return array{
     *     type: string,
     *     version: int,
     *     generated_at: string,
     *     examples: array<string, array<string, mixed>>
     * }
     */
    private function manifest(array $examples, CarbonImmutable $generatedAt): array
    {
        $entries = [];
        foreach ($examples as $example) {
            $draftPolicy = $this->policies->draftPolicyFor($example['slug'], $generatedAt);
            $entry = [
                'slug' => $example['slug'],
                'title' => $example['title'],
                'policy' => $example['policy'],
                'expected' => $example['expected'],
                'image' => ShowcaseExamples::imageUrlPath($example['slug']),
                'capsule' => ShowcaseExamples::capsuleUrlPath($example['slug']),
            ];

            if (isset($draftPolicy['access_window']) && is_array($draftPolicy['access_window'])) {
                $entry['access_window'] = $draftPolicy['access_window'];
            }

            if (isset($draftPolicy['capsule_lifetime_maximum'])) {
                $entry['capsule_lifetime_maximum'] = $draftPolicy['capsule_lifetime_maximum'];
            }

            if (($draftPolicy['automation_risk_required'] ?? false) === true) {
                $entry['automation_risk_required'] = true;
            }

            $entries[$example['slug']] = $entry;
        }

        return [
            'type' => 'share-capsules-showcase-manifest',
            'version' => 1,
            'generated_at' => $this->instant($generatedAt),
            'examples' => $entries,
        ];
    }

    private function instant(CarbonImmutable $instant): string
    {
        return $instant->utc()->startOfSecond()->format('Y-m-d\TH:i:s\Z');
    }
}
