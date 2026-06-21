<?php

namespace Tests\Feature;

use Tests\TestCase;

final class ExternalLinkBehaviorTest extends TestCase
{
    public function test_public_pages_open_every_external_http_link_in_a_safe_new_tab(): void
    {
        foreach ([
            route('home'),
            route('how-it-works'),
            route('technical'),
            route('terms'),
            route('privacy'),
        ] as $url) {
            $response = $this->get($url)->assertOk();

            preg_match_all(
                '/<a\b[^>]*href="(https?:\/\/[^">]+)"[^>]*>/i',
                $response->getContent(),
                $matches,
                PREG_SET_ORDER,
            );

            $externalAnchors = array_filter(
                $matches,
                static fn (array $match): bool => parse_url($match[1], PHP_URL_HOST) !== parse_url($url, PHP_URL_HOST),
            );

            $this->assertNotEmpty($externalAnchors, "Expected at least one external link on {$url}.");

            foreach ($externalAnchors as [$anchor]) {
                $this->assertStringContainsString('target="_blank"', $anchor, "External link must open in a new tab: {$anchor}");
                $this->assertStringContainsString('rel="noopener noreferrer"', $anchor, "External link must isolate the opener: {$anchor}");
            }
        }
    }
}
