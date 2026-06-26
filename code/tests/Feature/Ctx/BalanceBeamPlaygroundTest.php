<?php

namespace Tests\Feature\Ctx;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class BalanceBeamPlaygroundTest extends TestCase
{
    use RefreshDatabase;

    public function test_balance_beam_playground_renders_seeded_test_page(): void
    {
        $this->get(route('ctx.challenge-playground.balance-beam', ['seed' => '123456']))
            ->assertOk()
            ->assertSee('Balance Beam')
            ->assertSee('data-balance-beam-playground', false)
            ->assertSee('data-seed="123456"', false)
            ->assertSee('data-force-phase=', false)
            ->assertSee('Keep the marker inside the green zone while the force changes direction.')
            ->assertSee('Mouse or touch')
            ->assertSee('Keyboard')
            ->assertSee('Motion')
            ->assertSee('name="safe_ms"', false)
            ->assertSee('name="correction_count"', false)
            ->assertSee('name="edge_touch_count"', false)
            ->assertSee('Live score')
            ->assertSee('Start')
            ->assertSee('20s')
            ->assertSee('Complete check')
            ->assertSee('Play Again');
    }

    public function test_balance_beam_playground_is_local_only(): void
    {
        $this->app['env'] = 'production';

        $this->get(route('ctx.challenge-playground.balance-beam'))
            ->assertNotFound();
    }
}
