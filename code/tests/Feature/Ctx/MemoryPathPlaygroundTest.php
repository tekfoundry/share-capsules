<?php

namespace Tests\Feature\Ctx;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class MemoryPathPlaygroundTest extends TestCase
{
    use RefreshDatabase;

    public function test_memory_path_playground_renders_seeded_test_page(): void
    {
        $this->get(route('ctx.challenge-playground.memory-path', ['seed' => '123456']))
            ->assertOk()
            ->assertSee('Memory Path')
            ->assertSee('data-memory-path-playground', false)
            ->assertSee('data-seed="123456"', false)
            ->assertSee('data-sequence=', false)
            ->assertSee('Watch the colors, then repeat the growing sequence before time runs out.')
            ->assertSee('.pad[data-color="red"] { background: #ff9999; }', false)
            ->assertSee('.pad[data-color="red"][data-active="true"],', false)
            ->assertSee('.pad[data-color="red"]:active { background: #ff0000; }', false)
            ->assertSee('.pad[data-game-over="true"]', false)
            ->assertSee('Live score')
            ->assertSee('Start')
            ->assertSee('30s')
            ->assertSee('Complete check')
            ->assertSee('Play Again')
            ->assertDontSee('New path');
    }

    public function test_memory_path_playground_is_local_only(): void
    {
        $this->app['env'] = 'production';

        $this->get(route('ctx.challenge-playground.memory-path'))
            ->assertNotFound();
    }
}
