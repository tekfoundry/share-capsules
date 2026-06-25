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
            ->assertSee('no technology can prevent an authorized viewer from copying what they can see')
            ->assertSee('How an encrypted Capsule becomes viewable')
            ->assertSeeInOrder([
                'Encrypted content + trust policy',
                'Trusted Viewer',
                'CTX protocol',
                'Trust Provider',
                'Key Broker',
                'decrypts locally',
            ])
            ->assertSee('Open protocol, trusted providers')
            ->assertSee('Anyone can build. Official tools choose carefully.')
            ->assertSee('Secure content')
            ->assertSee('Publish content')
            ->assertSee('View content')
            ->assertSee('From original work to a trusted viewing session.')
            ->assertSeeInOrder([
                'Content creation',
                'Capsule creation',
                'Publish capsule',
                'Connection',
                'Policy check',
                'Key release',
                'Decryption',
            ])
            ->assertSee('Official registry')
            ->assertSee('CTX Protocol')
            ->assertSee('Trust Provider')
            ->assertSee('Key Broker')
            ->assertSee('Trust, without a universal trust score.')
            ->assertSee('Viewer decides whether to disclose the evidence needed for this request')
            ->assertSee('The creator receives the policy result')
            ->assertSee('not the Viewer’s email, identity, complete history, or raw evidence')
            ->assertSee('Security without mystery.')
            ->assertSee('What exists today—and what does not.')
            ->assertSee('Share Capsules is public experimental work, not a production content-protection service.')
            ->assertSee('TekFoundry sponsors and currently develops the Share Capsules reference implementation.')
            ->assertSee('not make TekFoundry the only possible provider or broker')
            ->assertSee('Built in public. Improved through scrutiny.')
            ->assertSee('href="mailto:info@tekfoundry.com?subject=Share%20Capsules%20feedback"', false)
            ->assertSee('images/tekfoundry-logo-black.png', false)
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
            ->assertSee('aria-label="Mobile primary navigation"', false)
            ->assertSee('aria-label="Footer navigation"', false)
            ->assertSee('id="main-content"', false)
            ->assertSee('tabindex="-1"', false)
            ->assertSee('id="problem"', false)
            ->assertSee('id="approach"', false)
            ->assertSee('id="lifecycle"', false)
            ->assertSee('aria-labelledby="access-architecture-title"', false)
            ->assertSee('aria-label="CTX protocol connections"', false)
            ->assertSee('id="trust"', false)
            ->assertSee('id="boundaries"', false)
            ->assertSee('id="project-status"', false);
    }

    public function test_the_registry_home_draft_route_is_removed_after_promotion(): void
    {
        $this->get('/draft/home-registry')->assertNotFound();
    }
}
