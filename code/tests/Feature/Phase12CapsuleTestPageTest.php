<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

final class Phase12CapsuleTestPageTest extends TestCase
{
    public function test_it_renders_the_production_capsule_markup(): void
    {
        $this->get('/capsule-test')
            ->assertOk()
            ->assertSee('TekFoundry Logo Capsule')
            ->assertSee('<capsule-viewer', false)
            ->assertSee('/phase12/capsules/tekfoundry-logo-r1.capsule', false)
            ->assertSee('fit="contain"', false)
            ->assertSee('viewer-height="320px"', false)
            ->assertSee('<fallback>', false)
            ->assertSee('<error>', false)
            ->assertSee('capsule-viewer > error', false);

        $this->assertTrue(File::exists(public_path('capsules/phase12/tekfoundry-logo.capsule')));
    }

    public function test_it_redirects_the_legacy_phase12_test_page_route(): void
    {
        $this->get('/phase12/capsule-test')
            ->assertMovedPermanently()
            ->assertRedirect('/capsule-test');
    }

    public function test_it_serves_the_test_capsule_with_static_host_headers(): void
    {
        $response = $this->withHeader('Origin', 'https://example.com')
            ->get('/phase12/capsules/tekfoundry-logo-r1.capsule')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/octet-stream')
            ->assertHeader('Access-Control-Allow-Origin', '*')
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        $cacheControl = $response->headers->get('Cache-Control', '');

        $this->assertStringContainsString('public', $cacheControl);
        $this->assertStringContainsString('max-age=31536000', $cacheControl);
        $this->assertStringContainsString('immutable', $cacheControl);
        $this->assertEmpty($response->headers->all('Set-Cookie'));
    }
}
