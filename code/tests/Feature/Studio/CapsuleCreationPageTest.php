<?php

namespace Tests\Feature\Studio;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CapsuleCreationPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_creator_studio_requires_an_active_verified_account(): void
    {
        $this->get(route('studio.capsules.create'))
            ->assertRedirect(route('login'));

        $this->actingAs(User::factory()->unverified()->create())
            ->get(route('studio.capsules.create'))
            ->assertRedirect(route('verification.notice'));
    }

    public function test_a_verified_creator_can_prepare_metadata_and_the_v1_policy(): void
    {
        $creator = User::factory()->create(['email_verified_at' => now()]);

        $this->actingAs($creator)
            ->get(route('studio.capsules.create'))
            ->assertOk()
            ->assertSee('Create a protected Capsule')
            ->assertSee('name="title"', false)
            ->assertSee('name="description"', false)
            ->assertDontSee('name="alt_text"', false)
            ->assertSee('Description <span class="font-normal text-muted">(optional)</span>', false)
            ->assertSee('Describe what the protected image shows')
            ->assertSee('will help screen readers when the image is unavailable')
            ->assertSee('If left blank, the title will be used instead')
            ->assertSee('name="global_limit"', false)
            ->assertSee('name="account_limit"', false)
            ->assertSee('name="automation_risk_required"', false)
            ->assertSee('name="access_from_date" type="date"', false)
            ->assertSee('name="access_through_date" type="date"', false)
            ->assertSee('Leave both dates blank to allow access at any time')
            ->assertSee('Access begins at midnight at the start of this date')
            ->assertSee('Access remains available for this entire date')
            ->assertSee('only a starting date or only a closing date')
            ->assertSee('active account, a verified email address, and a connected Share Capsules extension')
            ->assertSee('Limit how many times this Capsule can be opened')
            ->assertSee('count increases by one each time this Capsule is opened')
            ->assertSee('same opening increases both counts')
            ->assertSee('Leave a field blank for no limit at that level')
            ->assertSee('does not mean unlimited')
            ->assertSee('Across all viewer accounts')
            ->assertSee('maximum number of times the Capsule can be opened')
            ->assertSee('For each viewer account')
            ->assertSee('maximum number of times the Capsule can be opened per user account')
            ->assertSee('placeholder="No total limit"', false)
            ->assertSee('placeholder="No per-account limit"', false)
            ->assertSee('total limit must be greater than or equal to the per-account limit')
            ->assertDontSee('name="global_limit_enabled"', false)
            ->assertDontSee('name="account_limit_enabled"', false);
    }

    public function test_the_page_exposes_an_extension_handoff_without_a_server_content_form(): void
    {
        $creator = User::factory()->create(['email_verified_at' => now()]);

        $this->actingAs($creator)
            ->get(route('studio.capsules.create'))
            ->assertOk()
            ->assertSee('data-capsule-creator-draft', false)
            ->assertSee('data-capsule-extension-handoff', false)
            ->assertSee('Continue in the extension')
            ->assertSee('intentionally has no file upload')
            ->assertDontSee('type="file"', false)
            ->assertDontSee('name="private_key"', false)
            ->assertDontSee('name="recovery_code"', false)
            ->assertDontSee('enctype="multipart/form-data"', false)
            ->assertDontSee('name="source"', false);
    }

    public function test_the_page_explains_the_complete_v1_creation_and_distribution_boundary(): void
    {
        $creator = User::factory()->create(['email_verified_at' => now()]);

        $this->actingAs($creator)
            ->get(route('studio.capsules.create'))
            ->assertOk()
            ->assertSee('Supported files')
            ->assertSee('JPEG, PNG, or WebP image')
            ->assertSee('Maximum file size')
            ->assertSee('About 26 MB')
            ->assertSee('Additional file types are planned')
            ->assertSee('Image compatibility details')
            ->assertSee('exact file-size limit is 25 MiB')
            ->assertSee('16,384 pixels in either direction')
            ->assertSee('40 million total pixels')
            ->assertSee('What counts as an opening')
            ->assertSee('unusual case that the connection fails after the key is released')
            ->assertSee('does not verify someone’s identity or intentions')
            ->assertSee('Why the extension is required')
            ->assertSee('Your original image stays on your computer')
            ->assertSee('never uploaded to Share Capsules servers')
            ->assertSee('Only the encrypted Capsule is exported')
            ->assertSee('securely sends the one-time decryption key to a separate protected Share Capsules key service')
            ->assertSee('Your original image is not sent with it')
            ->assertSee('Protection has a real boundary')
            ->assertSee('cannot prevent an authorized viewer from taking screenshots')
            ->assertSee('Publish through a compatible Host')
            ->assertSee('both the page and Capsule URL must remain HTTPS')
            ->assertSee('allow an unauthenticated')
            ->assertSee('Access-Control-Allow-Origin: *')
            ->assertSee('Immutable revisions')
            ->assertSee('does not need a database, user accounts, Share Capsules plugin, cookies, or custom server-side code');
    }
}
