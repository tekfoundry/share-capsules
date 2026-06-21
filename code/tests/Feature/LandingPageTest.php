<?php

namespace Tests\Feature;

use Tests\TestCase;

final class LandingPageTest extends TestCase
{
    public function test_it_presents_the_creator_focused_product_foundation(): void
    {
        $response = $this->get('/');

        $response
            ->assertOk()
            ->assertSee('Share Capsules')
            ->assertSee('Share your work with people.')
            ->assertSee('Not with every machine that asks.')
            ->assertSee('The web asks creators to choose between reach and control.')
            ->assertSee('Encrypted content with creator-defined access.')
            ->assertSee('Capsule Trust Exchange (CTX)')
            ->assertSee('without exposing the Viewer’s raw account history to the creator or Host')
            ->assertSeeInOrder([
                'Capsule Trust Exchange (CTX)',
                'A trusted Viewer uses CTX',
            ])
            ->assertSee('no technology can prevent an authorized viewer from copying what they can see')
            ->assertSee('Protected content moves. Control stays visible.')
            ->assertSeeInOrder([
                'Encrypt + sign',
                'Serve ciphertext',
                'Fetch + verify',
                'Evaluate policy',
                'Release to device',
                'Decrypt + render',
            ])
            ->assertSee('The Host distributes an encrypted file.')
            ->assertSee('The Viewer decrypts locally.')
            ->assertSee('Trust, without a universal trust score.')
            ->assertSee('Each creator defines the conditions required for their Capsule.')
            ->assertSee('Viewer-consented evidence')
            ->assertSee('The creator receives the policy result')
            ->assertSee('not the Viewer’s email, identity, complete history, or raw evidence')
            ->assertSee('Security without mystery.')
            ->assertSee('What exists today—and what does not.')
            ->assertSee('Share Capsules is public experimental work, not a production content-protection service.')
            ->assertSee('Sponsored by')
            ->assertSee('TekFoundry')
            ->assertSee('info@tekfoundry.com');
    }

    public function test_it_includes_accessible_navigation_and_project_status_landmarks(): void
    {
        $response = $this->get('/');

        $response
            ->assertOk()
            ->assertSee('Skip to content')
            ->assertSee('aria-label="Primary navigation"', false)
            ->assertSee('id="main-content"', false)
            ->assertSee('id="problem"', false)
            ->assertSee('id="approach"', false)
            ->assertSee('id="workflow"', false)
            ->assertSee('aria-label="Share Capsules access workflow"', false)
            ->assertSee('id="trust"', false)
            ->assertSee('id="boundaries"', false)
            ->assertSee('id="project-status"', false);
    }
}
