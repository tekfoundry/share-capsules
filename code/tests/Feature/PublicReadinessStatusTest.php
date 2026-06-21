<?php

namespace Tests\Feature;

use Tests\TestCase;

final class PublicReadinessStatusTest extends TestCase
{
    public function test_every_explanatory_page_distinguishes_vision_reality_and_deferred_work(): void
    {
        foreach ([route('home'), route('how-it-works'), route('technical')] as $url) {
            $this->get($url)
                ->assertOk()
                ->assertSeeInOrder([
                    'Long-term vision',
                    'Implemented and tested',
                    'Active development',
                    'Deferred beyond V1',
                ])
                ->assertSee('not a production content-protection service')
                ->assertSee('id="'.($url === route('technical') ? 'status' : 'project-status').'"', false);
        }
    }
}
