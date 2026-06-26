<?php

namespace Tests\Feature;

use Tests\TestCase;

final class PublicMetadataTest extends TestCase
{
    /** @return array<string, array{string, string}> */
    public static function publicPages(): array
    {
        return [
            'home' => [route('home'), 'Share Capsules — Share your work with people, not harvesters'],
            'how it works' => [route('how-it-works'), 'How Share Capsules works — Capsules, CTX, and trusted viewing'],
            'technical' => [route('technical'), 'Technical overview — Capsule and CTX architecture'],
            'terms' => [route('terms'), 'Account terms — Share Capsules'],
            'privacy' => [route('privacy'), 'Privacy notice — Share Capsules'],
        ];
    }

    public function test_public_pages_publish_complete_search_and_social_metadata(): void
    {
        foreach (self::publicPages() as [$url, $title]) {
            $this->get($url)
                ->assertOk()
                ->assertSee("<title>{$title}</title>", false)
                ->assertSee('<meta name="description" content="', false)
                ->assertSee('<meta name="robots" content="index, follow">', false)
                ->assertSee('<link rel="canonical" href="'.$url.'">', false)
                ->assertSee('<meta property="og:title" content="'.$title.'">', false)
                ->assertSee('<meta property="og:url" content="'.$url.'">', false)
                ->assertSee('<meta property="og:image" content="'.asset('images/share-capsules-social.png').'">', false)
                ->assertSee('<meta property="og:image:width" content="1200">', false)
                ->assertSee('<meta property="og:image:height" content="630">', false)
                ->assertSee('<meta name="twitter:card" content="summary_large_image">', false);
        }
    }

    public function test_account_pages_default_to_noindex(): void
    {
        $this->get(route('login'))
            ->assertOk()
            ->assertSee('<meta name="robots" content="noindex, nofollow">', false);
    }

    public function test_legal_pages_explain_human_challenge_privacy_boundaries(): void
    {
        $this->get(route('privacy'))
            ->assertOk()
            ->assertSee('Trust Capsules may ask eligible viewers to complete quick human challenges')
            ->assertSee('bounded derived results')
            ->assertSee('Challenge results are temporary access evidence')
            ->assertSee('Capsule creators and Host websites do not receive raw challenge telemetry')
            ->assertSee('raw trust scores')
            ->assertSee('complete session replay');

        $this->get(route('terms'))
            ->assertOk()
            ->assertSee('Trust Capsules may require quick human challenges')
            ->assertSee('temporary evidence for access confidence')
            ->assertSee('not proof of identity, unique personhood, or trustworthy behavior')
            ->assertSee('High automation-risk activity may still block access');
    }

    public function test_the_social_image_has_the_declared_dimensions(): void
    {
        $path = public_path('images/share-capsules-social.png');
        $this->assertFileExists($path);

        $dimensions = getimagesize($path);
        $this->assertIsArray($dimensions);
        $this->assertSame(1200, $dimensions[0]);
        $this->assertSame(630, $dimensions[1]);
        $this->assertSame('image/png', $dimensions['mime']);
    }
}
