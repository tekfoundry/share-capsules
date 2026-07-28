<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

final class Phase12CapsuleTestPageTest extends TestCase
{
    public function test_it_renders_the_production_capsule_markup(): void
    {
        $this->get('/phase12/capsule-test')
            ->assertOk()
            ->assertSee('TekFoundry Logo Capsule')
            ->assertSee('<capsule-viewer', false)
            ->assertSee('/capsules/phase12/tekfoundry-logo.capsule', false)
            ->assertSee('fit="contain"', false)
            ->assertSee('viewer-height="320px"', false)
            ->assertSee('<fallback>', false)
            ->assertSee('<error>', false)
            ->assertSee('capsule-viewer > error', false);

        $this->assertTrue(File::exists(public_path('capsules/phase12/tekfoundry-logo.capsule')));
    }
}
