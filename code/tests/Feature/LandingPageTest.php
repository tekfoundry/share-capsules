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
            ->assertSee('Protect the work.')
            ->assertSee('Share with intention.')
            ->assertSee('Creator-controlled access')
            ->assertSee('Security without mystery.')
            ->assertSee('Active experimental development')
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
            ->assertSee('id="approach"', false)
            ->assertSee('id="boundaries"', false)
            ->assertSee('id="project-status"', false);
    }
}
