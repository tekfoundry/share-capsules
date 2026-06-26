<?php

namespace Tests\Feature\Ctx;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CargoSortPlaygroundTest extends TestCase
{
    use RefreshDatabase;

    public function test_cargo_sort_playground_renders_seeded_test_page(): void
    {
        $this->get(route('ctx.challenge-playground.cargo-sort', ['seed' => '123456']))
            ->assertOk()
            ->assertSee('Cargo Sort')
            ->assertSee('data-cargo-sort-playground', false)
            ->assertSee('data-seed="123456"', false)
            ->assertSee('data-rule-break-at="4"', false)
            ->assertSee('Select each cargo tile, then choose a bin that matches the active rule.')
            ->assertSee('Active rule: match the shape.')
            ->assertSee('Live score')
            ->assertSee('Pace')
            ->assertSee('let startedAt = null;', false)
            ->assertSee('if (startedAt === null) startedAt = performance.now();', false)
            ->assertSee('const currentElapsedMs = () => {', false)
            ->assertSee('const end = completedAt === null ? performance.now() : completedAt;', false)
            ->assertSee('if (sorted >= 9 && completedAt === null) completedAt = performance.now();', false)
            ->assertSee('data-shape="triangle"', false)
            ->assertSee('data-color="green"', false)
            ->assertSee('data-bin-kind="shape"', false)
            ->assertSee('data-bin-value="triangle"', false)
            ->assertSee('Circle bin')
            ->assertSee('Square bin')
            ->assertSee('Triangle bin')
            ->assertSee('Blue bin')
            ->assertSee('Green bin')
            ->assertSee('Gold bin')
            ->assertSee('Rose bin')
            ->assertSee('Complete check')
            ->assertSee('New cargo');
    }

    public function test_cargo_sort_playground_is_local_only(): void
    {
        $this->app['env'] = 'production';

        $this->get(route('ctx.challenge-playground.cargo-sort'))
            ->assertNotFound();
    }
}
