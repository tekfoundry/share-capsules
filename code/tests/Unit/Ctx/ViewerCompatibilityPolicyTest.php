<?php

namespace Tests\Unit\Ctx;

use App\Ctx\ViewerCompatibility\ViewerCompatibilityPolicy;
use Tests\TestCase;

final class ViewerCompatibilityPolicyTest extends TestCase
{
    public function test_it_accepts_the_published_minimum_chrome_and_chromium_viewers(): void
    {
        $policy = new ViewerCompatibilityPolicy;

        $this->assertTrue($policy->accepts($this->viewer()));
        $this->assertTrue($policy->accepts($this->viewer(['browser_family' => 'Chromium'])));
    }

    public function test_it_rejects_unsupported_browsers_old_browser_versions_and_old_viewers(): void
    {
        $policy = new ViewerCompatibilityPolicy;

        $this->assertFalse($policy->accepts($this->viewer(['browser_family' => 'Firefox'])));
        $this->assertFalse($policy->accepts($this->viewer(['browser_major' => 148])));
        $this->assertFalse($policy->accepts($this->viewer(['version' => '0.0.9'])));
    }

    public function test_it_rejects_suspended_viewer_releases(): void
    {
        config()->set('sharecapsules.extension.viewer.suspended_versions', ['0.1.0']);

        $this->assertFalse((new ViewerCompatibilityPolicy)->accepts($this->viewer()));
    }

    /** @param array<string, mixed> $overrides */
    private function viewer(array $overrides = []): array
    {
        return [
            'name' => 'share-capsules-chromium-extension',
            'version' => '0.1.0',
            'browser_family' => 'Chrome',
            'browser_major' => 149,
            ...$overrides,
        ];
    }
}
