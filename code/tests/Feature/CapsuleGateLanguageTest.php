<?php

namespace Tests\Feature;

use Tests\TestCase;

final class CapsuleGateLanguageTest extends TestCase
{
    public function test_home_page_renders_the_capsule_access_rules_explainer_with_responsive_sections(): void
    {
        $this->get(route('home'))
            ->assertOk()
            ->assertSee('Capsule access rules')
            ->assertSee('One Capsule format, several ways to decide when it opens.')
            ->assertSee('Capsules can be configured with time, limit, and trust policies.')
            ->assertSee('The Viewer opens the encrypted content only when every required policy is satisfied.')
            ->assertSee('Allows creators to set opening and closing dates.')
            ->assertSee('Allows creators to limit how many times protected content can be viewed')
            ->assertSee('The trust score considers recent usage patterns and quick human challenges')
            ->assertSee('Combines selected rules so time, limit, and trust requirements must all pass')
            ->assertSee('Trust checks help reduce automated access, but they are not a perfect guarantee.')
            ->assertSee('lg:grid-cols-[0.8fr_1.2fr]', false)
            ->assertSee('sm:grid-cols-2', false)
            ->assertSee('md:grid-cols-4', false);
    }

    public function test_how_it_works_page_uses_the_same_gate_language_without_claiming_personhood(): void
    {
        $this->get(route('how-it-works'))
            ->assertOk()
            ->assertSee('Capsule access rules')
            ->assertSee('A Time Capsule, Limit Capsule, Trust Capsule, or Combined Capsule allows creators')
            ->assertSee('Quick check needed')
            ->assertSee('Blocked for risk')
            ->assertSee('They do not prove that a viewer is a unique person')
            ->assertSee('generally trustworthy')
            ->assertSee('guaranteed to use the content well')
            ->assertSee('aria-labelledby="capsule-access-rules-title"', false);
    }

    public function test_viewer_guidance_pages_cover_all_gate_outcomes_with_responsive_cards(): void
    {
        $this->get(route('instructions'))
            ->assertOk()
            ->assertSee('What viewers may see')
            ->assertSee('Capsule opens')
            ->assertSee('Capsule locked by rule')
            ->assertSee('Quick human challenge')
            ->assertSee('Blocked for automation risk')
            ->assertSee('The time, limit, account, device, and trust policies are satisfied')
            ->assertSee('A Trust Capsule may ask an otherwise eligible viewer to complete a short check')
            ->assertSee('sm:grid-cols-2', false);

        $this->get(route('viewer.install'))
            ->assertOk()
            ->assertSee('What may happen when you return')
            ->assertSee('The Capsule opens')
            ->assertSee('The Capsule stays locked')
            ->assertSee('A quick human challenge may appear')
            ->assertSee('outside its time window, out of configured views, or blocked by current automation risk')
            ->assertSee('sm:grid-cols-2', false)
            ->assertSee('sm:col-span-2', false);
    }
}
