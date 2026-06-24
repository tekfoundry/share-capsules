<?php

namespace Tests\Feature;

use Tests\TestCase;

final class ViewerInstallPageTest extends TestCase
{
    public function test_the_viewer_install_page_explains_the_no_extension_path(): void
    {
        $this->get(route('viewer.install'))
            ->assertOk()
            ->assertSee('Install or enable the Share Capsules Viewer.')
            ->assertSee('The public store listing will be linked here when the V1 extension is published.')
            ->assertSee('go back to the website where you found the Capsule and reload the page')
            ->assertSee('does not provide a browser-only fallback decryption path');
    }

    public function test_a_safe_public_return_url_can_be_shown(): void
    {
        $returnTo = 'https://example.com/gallery/capsules.html';

        $this->get(route('viewer.install', ['return_to' => $returnTo]))
            ->assertOk()
            ->assertSee('Return to the Capsule page')
            ->assertSee('href="'.$returnTo.'"', false)
            ->assertSee('does not contain account credentials, authorization tickets, content keys');
    }

    public function test_sensitive_or_non_web_return_urls_are_ignored(): void
    {
        foreach ([
            'javascript:alert(1)',
            'https://user:pass@example.com/gallery',
            'https://example.com/gallery#access_token=secret',
            'https://example.com/gallery?token=secret',
            'https://example.com/gallery?ctx_ticket=secret',
            'https://example.com/gallery?recovery_code=secret',
        ] as $returnTo) {
            $this->get(route('viewer.install', ['return_to' => $returnTo]))
                ->assertOk()
                ->assertDontSee('Return to the Capsule page')
                ->assertSee('go back to the website where you found the Capsule and reload the page');
        }
    }
}
