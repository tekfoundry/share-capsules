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
            ->assertSee('no technology can prevent an authorized viewer from copying what they can see')
            ->assertSee('Security without mystery.')
            ->assertSee('Active experimental development')
            ->assertSee('the complete creator-to-viewer protection flow does not exist yet')
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
            ->assertSee('id="boundaries"', false)
            ->assertSee('id="project-status"', false);
    }
}
