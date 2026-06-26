<?php

namespace Tests\Feature;

use Tests\TestCase;

final class InstructionsPageTest extends TestCase
{
    public function test_the_instructions_page_explains_viewer_outcomes(): void
    {
        $this->get(route('instructions'))
            ->assertOk()
            ->assertSee('What viewers may see')
            ->assertSee('Capsule opens')
            ->assertSee('Capsule locked by rule')
            ->assertSee('Quick human challenge')
            ->assertSee('Blocked for automation risk')
            ->assertSee('A Time Capsule may be outside its date window')
            ->assertSee('a Limit Capsule may have reached a configured view limit')
            ->assertSee('Recent high-risk usage patterns can keep access blocked');
    }
}
