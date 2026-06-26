<?php

namespace App\Ctx\ViewerCompatibility;

final class ViewerCompatibilityPolicy
{
    /** @param array<string, mixed> $viewer */
    public function accepts(array $viewer): bool
    {
        $name = $viewer['name'] ?? null;
        $version = $viewer['version'] ?? null;
        $browserFamily = $viewer['browser_family'] ?? null;
        $browserMajor = $viewer['browser_major'] ?? null;

        if (! is_string($name) || ! is_string($version) || ! is_string($browserFamily) || ! is_int($browserMajor)) {
            return false;
        }

        if (! hash_equals((string) config('sharecapsules.extension.viewer.name'), $name)) {
            return false;
        }

        if (! in_array($browserFamily, config('sharecapsules.extension.viewer.supported_browser_families', []), true)) {
            return false;
        }

        if ($browserMajor < (int) config('sharecapsules.extension.viewer.minimum_chromium_major')) {
            return false;
        }

        if ($this->compareVersions($version, (string) config('sharecapsules.extension.viewer.minimum_version')) < 0) {
            return false;
        }

        return ! in_array($version, config('sharecapsules.extension.viewer.suspended_versions', []), true);
    }

    private function compareVersions(string $left, string $right): int
    {
        return version_compare($left, $right);
    }
}
