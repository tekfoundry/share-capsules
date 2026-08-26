<?php

namespace Tests\Feature;

use Tests\TestCase;

final class TechnicalOverviewPageTest extends TestCase
{
    public function test_it_covers_the_architecture_boundaries_scope_and_honest_status(): void
    {
        $this->get(route('technical'))
            ->assertOk()
            ->assertSee('Open protocol. Opinionated official network.')
            ->assertSee('Capsule Trust Exchange (CTX)')
            ->assertSee('The protocol and the official network are separate layers.')
            ->assertSee('The Host distributes bytes; the Viewer drives trust and key release.')
            ->assertSee('The signed manifest fixes the security-critical wiring.')
            ->assertSee('Distinct keys, distinct purposes, no silent substitution.')
            ->assertSee('Recognition is a product security boundary, not protocol ownership.')
            ->assertSee('Policy predicates, not a universal trust score.')
            ->assertSee('A focused proof, not universal content control.')
            ->assertSee('Secure image sharing is ready to use.')
            ->assertSee('Use the hosted service')
            ->assertSee('Still coming later');
    }

    public function test_knowledge_base_sources_become_links_when_the_public_repository_is_configured(): void
    {
        config()->set('sharecapsules.public.repository_url', 'https://github.com/tekfoundry/share-capsules');

        $this->get(route('technical'))
            ->assertOk()
            ->assertSee('id="design-sources"', false)
            ->assertSee(
                'href="https://github.com/tekfoundry/share-capsules/blob/master/_docs/kb/03-architecture/system-architecture.md"',
                false,
            )
            ->assertSee('_docs/kb/03-architecture/v1-contracts-and-specifications.md')
            ->assertSee('_docs/kb/07-decisions/ADR-0001-open-protocol-official-network.md')
            ->assertSee('_docs/kb/04-security/security-and-privacy.md');
    }
}
