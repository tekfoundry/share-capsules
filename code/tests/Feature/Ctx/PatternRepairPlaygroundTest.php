<?php

namespace Tests\Feature\Ctx;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class PatternRepairPlaygroundTest extends TestCase
{
    use RefreshDatabase;

    public function test_pattern_repair_playground_renders_seeded_test_page(): void
    {
        $this->get(route('ctx.challenge-playground.pattern-repair', ['seed' => '123456']))
            ->assertOk()
            ->assertSee('Pattern Repair')
            ->assertSee('data-pattern-repair-playground', false)
            ->assertSee('data-seed="123456"', false)
            ->assertSee('data-correct-key=', false)
            ->assertSee('Find the tile that repairs the broken spot in the pattern.')
            ->assertSee('name="correct_count"', false)
            ->assertSee('name="mistake_count"', false)
            ->assertSee('name="attempt_count"', false)
            ->assertSee('Live score')
            ->assertSee('Complete check')
            ->assertSee('Play Again');
    }

    public function test_pattern_repair_playground_is_local_only(): void
    {
        $this->app['env'] = 'production';

        $this->get(route('ctx.challenge-playground.pattern-repair'))
            ->assertNotFound();
    }
}
