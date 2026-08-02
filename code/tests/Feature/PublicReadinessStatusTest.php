<?php

namespace Tests\Feature;

use Tests\TestCase;

final class PublicReadinessStatusTest extends TestCase
{
    public function test_every_explanatory_page_describes_available_features_and_remaining_scope(): void
    {
        foreach ([route('home'), route('how-it-works'), route('technical')] as $url) {
            $this->get($url)
                ->assertOk()
                ->assertSeeInOrder([
                    'Protect images',
                    'Choose access rules',
                    'Use the hosted service',
                    'Still coming later',
                ])
                ->assertSee('Secure image sharing is ready to use.')
                ->assertSee('The hosted Share Capsules services handle the account, access, and key-release steps')
                ->assertSee('id="'.($url === route('technical') ? 'status' : 'project-status').'"', false);
        }
    }
}
