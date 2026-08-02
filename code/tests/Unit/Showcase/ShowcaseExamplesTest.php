<?php

namespace Tests\Unit\Showcase;

use App\Showcase\ShowcaseExamples;
use InvalidArgumentException;
use Tests\TestCase;

final class ShowcaseExamplesTest extends TestCase
{
    public function test_examples_expose_selected_source_images(): void
    {
        $examples = ShowcaseExamples::all();

        $this->assertSame([
            'open-image',
            'time-future',
            'time-open',
            'time-expired',
            'limit',
            'trust',
            'revoked',
        ], array_column($examples, 'slug'));

        foreach ($examples as $example) {
            $this->assertFileExists(ShowcaseExamples::imagePath($example['slug']));
            $this->assertStringStartsWith('/showcase/images/', ShowcaseExamples::imageUrlPath($example['slug']));
            $this->assertStringStartsWith(public_path('showcase/capsules/'), ShowcaseExamples::capsulePath($example['slug']));
            $this->assertStringStartsWith('/showcase/capsules/', ShowcaseExamples::capsuleUrlPath($example['slug']));
            $this->assertStringEndsWith('.jpg', $example['image']);
            $this->assertStringEndsWith('-r1.capsule', $example['capsule']);
        }
    }

    public function test_unknown_example_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);

        ShowcaseExamples::get('missing');
    }
}
