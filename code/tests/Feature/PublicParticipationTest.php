<?php

namespace Tests\Feature;

use Tests\TestCase;

final class PublicParticipationTest extends TestCase
{
    public function test_it_links_directly_to_the_public_project_repository(): void
    {
        $this->get(route('home'))
            ->assertOk()
            ->assertSee('href="https://github.com/tekfoundry/share-capsules"', false)
            ->assertSee('Review the project on GitHub')
            ->assertSee('target="_blank"', false)
            ->assertSee('rel="noopener noreferrer"', false);
    }
}
