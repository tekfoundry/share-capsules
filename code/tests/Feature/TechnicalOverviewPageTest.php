<?php

namespace Tests\Feature;

use Tests\TestCase;

final class TechnicalOverviewPageTest extends TestCase
{
    public function test_it_covers_the_architecture_boundaries_scope_and_honest_status(): void
    {
        $this->get(route('technical'))
            ->assertOk()
            ->assertSee('A portable encrypted-content and trust-exchange architecture.')
            ->assertSee('Capsule Trust Exchange (CTX)')
            ->assertSee('Distribution is separate from authorization.')
            ->assertSee('Keys have separate purposes and owners.')
            ->assertSee('Conditions and predicates—not a universal reputation currency.')
            ->assertSee('Protocol before monopoly.')
            ->assertSee('A focused proof, not universal content control.')
            ->assertSee('What exists today—and what does not.')
            ->assertSee('Active development')
            ->assertSee('Deferred beyond V1');
    }

    public function test_design_sources_become_links_when_the_public_repository_is_configured(): void
    {
        config()->set('sharecapsules.public.repository_url', 'https://github.com/tekfoundry/share-capsules');

        $this->get(route('technical'))
            ->assertOk()
            ->assertSee('id="design-sources"', false)
            ->assertSee(
                'href="https://github.com/tekfoundry/share-capsules/blob/master/_docs/design/03_architecture/system-overview.md"',
                false,
            )
            ->assertSee('_docs/design/07_security-and-privacy/threat-model-v1.md');
    }
}
