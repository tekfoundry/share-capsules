<?php

namespace Tests\Feature;

use Tests\TestCase;

final class PublicParticipationTest extends TestCase
{
    public function test_it_uses_the_sponsor_github_presence_until_a_project_repository_is_published(): void
    {
        $this->get(route('home'))
            ->assertOk()
            ->assertSee('href="https://github.com/tekfoundry"', false)
            ->assertSee('Follow TekFoundry on GitHub')
            ->assertSee('The direct public project repository link will appear when publication is configured.');
    }

    public function test_it_links_directly_to_the_configured_public_project_repository(): void
    {
        config()->set('sharecapsules.public.repository_url', 'https://github.com/tekfoundry/share-capsules');

        $this->get(route('home'))
            ->assertOk()
            ->assertSee('href="https://github.com/tekfoundry/share-capsules"', false)
            ->assertSee('Review the project on GitHub')
            ->assertDontSee('The direct public project repository link will appear when publication is configured.');
    }
}
