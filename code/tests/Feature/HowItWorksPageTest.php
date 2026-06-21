<?php

namespace Tests\Feature;

use Tests\TestCase;

final class HowItWorksPageTest extends TestCase
{
    public function test_it_explains_the_complete_flow_and_each_participant_boundary(): void
    {
        $this->get(route('how-it-works'))
            ->assertOk()
            ->assertSee('From original work to an authorized Viewer.')
            ->assertSee('Proposed complete flow — under active development')
            ->assertSeeInOrder([
                'Creator tool',
                'Compatible Host',
                'Trusted Viewer',
                'CTX Provider',
                'Key Broker',
                'Decrypt + render',
            ])
            ->assertSee('One flow, deliberately separated responsibilities.')
            ->assertSee('The key moves only after the policy is satisfied.')
            ->assertSee('What this architecture cannot promise')
            ->assertSee('it does not make visible work impossible to copy or prove future human intent');
    }

    public function test_it_has_public_navigation_metadata_and_semantic_workflow(): void
    {
        $this->get(route('how-it-works'))
            ->assertOk()
            ->assertSee('<title>How Share Capsules works — Capsules, CTX, and trusted viewing</title>', false)
            ->assertSee('name="description"', false)
            ->assertSee('id="access-workflow"', false)
            ->assertSee('aria-label="Share Capsules access workflow"', false)
            ->assertSee('href="'.route('how-it-works').'"', false)
            ->assertSee('info@tekfoundry.com');
    }
}
