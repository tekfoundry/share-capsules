<?php

namespace Tests\Feature\Ctx;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class SignalTunePlaygroundTest extends TestCase
{
    use RefreshDatabase;

    public function test_signal_tune_playground_renders_seeded_test_page(): void
    {
        $this->get(route('ctx.challenge-playground.signal-tune', ['seed' => '123456']))
            ->assertOk()
            ->assertSee('Signal Tune')
            ->assertSee('data-signal-tune-playground', false)
            ->assertSee('data-seed="123456"', false)
            ->assertSee('data-target-amplitude="40"', false)
            ->assertSee('data-target-frequency="36"', false)
            ->assertSee('data-target-phase="-14"', false)
            ->assertSee('Adjust the three controls until the blue signal locks onto the dark target.')
            ->assertSee('aria-live="polite"', false)
            ->assertSee('Amplitude')
            ->assertSee('Frequency')
            ->assertSee('Phase')
            ->assertSee('Live score')
            ->assertSee('Complete check')
            ->assertSee('New signal')
            ->assertDontSee('% match');
    }

    public function test_signal_tune_playground_is_local_only(): void
    {
        $this->app['env'] = 'production';

        $this->get(route('ctx.challenge-playground.signal-tune'))
            ->assertNotFound();
    }
}
