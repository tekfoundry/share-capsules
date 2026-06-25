<?php

namespace Tests\Feature;

use Tests\TestCase;

final class HowItWorksPageTest extends TestCase
{
    public function test_it_explains_the_complete_flow_and_each_participant_boundary(): void
    {
        $this->get(route('how-it-works'))
            ->assertOk()
            ->assertSee('From original work to a trusted viewing session.')
            ->assertSee('Proposed complete flow — under active development')
            ->assertSeeInOrder([
                'Creator',
                'Creator tool',
                'Host website',
                'Viewer',
                'Official registry',
                'CTX Protocol',
                'Trust Provider',
                'Key Broker',
                'Trusted Viewer',
            ])
            ->assertSee('One flow, deliberately separated responsibilities.')
            ->assertSee('From original work to a trusted viewing session.')
            ->assertSee('Publish capsule')
            ->assertSee('The journey works because each participant has a narrow job.')
            ->assertSee('The key moves only after the policy is satisfied.')
            ->assertSee('checks that the required services are recognized')
            ->assertSee('What this architecture cannot promise')
            ->assertSee('it does not make visible work impossible to copy or prove future human intent');
    }

    public function test_it_has_public_navigation_metadata_and_semantic_workflow(): void
    {
        $this->get(route('how-it-works'))
            ->assertOk()
            ->assertSee('<title>How Share Capsules works — Capsules, CTX, and trusted viewing</title>', false)
            ->assertSee('name="description"', false)
            ->assertSee('id="lifecycle"', false)
            ->assertSee('aria-label="A license broker releasing a key to open the Capsule"', false)
            ->assertSee('href="'.route('how-it-works').'"', false)
            ->assertSee('info@tekfoundry.com');
    }
}
