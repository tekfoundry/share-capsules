<?php

namespace Tests\Feature;

use App\Showcase\ShowcaseExamples;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

final class ShowcaseStaticPageTest extends TestCase
{
    public function test_static_showcase_page_references_every_generated_example(): void
    {
        $path = public_path('showcase.html');

        $this->assertTrue(File::exists($path));
        $html = File::get($path);

        $this->assertStringContainsString('<title>Share Capsules Showcase</title>', $html);
        $this->assertStringContainsString('Original images beside protected Capsules', $html);
        $this->assertStringContainsString('intentionally public', $html);
        $this->assertStringContainsString('No additional policy gates', $html);
        $this->assertStringContainsString('<capsule-viewer', $html);
        $this->assertStringContainsString('data-showcase-frame', $html);
        $this->assertStringContainsString('syncShowcaseFrames', $html);
        $this->assertStringContainsString('<content class="viewer-frame"></content>', $html);
        $this->assertStringContainsString('Viewing window', $html);
        $this->assertStringContainsString('2026-08-01T16:33:51Z', $html);
        $this->assertStringContainsString('2026-08-04T16:33:51Z', $html);
        $this->assertStringContainsString('2026-07-31T16:33:51Z', $html);
        $this->assertStringContainsString('/viewer/install?return_to=https%3A%2F%2Fsharecapsules.com%2Fshowcase.html', $html);

        foreach (ShowcaseExamples::all() as $example) {
            $this->assertStringContainsString('id="'.$example['slug'].'"', $html);
            $this->assertStringContainsString(ShowcaseExamples::imageUrlPath($example['slug']), $html);
            $this->assertStringContainsString(ShowcaseExamples::capsuleUrlPath($example['slug']), $html);
            $this->assertTrue(File::exists(ShowcaseExamples::imagePath($example['slug'])));
            $this->assertTrue(File::exists(ShowcaseExamples::capsulePath($example['slug'])));
        }
    }
}
