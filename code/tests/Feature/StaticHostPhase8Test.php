<?php

namespace Tests\Feature;

use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Ctx\SigningKeys\TicketSigningKeyLifecycle;
use App\Ctx\Tickets\CtxTicketRedemptionService;
use App\Ctx\Tickets\TicketRedemptionCode;
use App\Models\CreatorCapsule;
use App\Models\CtxAuthorizationTicket;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

final class StaticHostPhase8Test extends TestCase
{
    use RefreshDatabase;

    public function test_static_host_revoked_capsule_fixture_documents_and_locks_after_revocation(): void
    {
        $fixturePath = base_path('../_examples/static-host/capsules/revoked-capsule-baseline.capsule');
        $page = file_get_contents(base_path('../_examples/static-host/test.html'));
        $readme = file_get_contents(base_path('../_examples/static-host/README.md'));

        $this->assertFileExists($fixturePath);
        $this->assertStringContainsString('./capsules/revoked-capsule-baseline.capsule', $page);
        $this->assertStringContainsString('locked / no longer available', $page);
        $this->assertStringContainsString('baseline signed eligibility policy', $page);
        $this->assertStringContainsString('capsules/revoked-capsule-baseline.capsule', $readme);

        $creator = User::factory()->create(['email_verified_at' => now()]);
        [$viewer, $device] = $this->viewerIdentity();
        $policySha256 = sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
        $releaseHandle = 'LX5xa629YQlli8ZHYTapevMOgaU0gorIeuXMjsNqXlo';
        $capsuleId = 'urn:uuid:4b7e64e4-3a59-4d1d-a0ab-c5bbf4d35c31';

        CreatorCapsule::query()->create([
            'user_id' => $creator->getKey(),
            'registration_id' => 'registration_'.str_repeat('a', 32),
            'capsule_id' => $capsuleId,
            'capsule_revision' => 1,
            'payload_id' => 'primary',
            'broker' => 'http://localhost:3004',
            'release_handle' => $releaseHandle,
            'policy_sha256' => $policySha256,
            'policy' => [],
            'status' => CapsuleLifecycleStatus::Revoked,
            'pending_expires_at' => now(),
            'finalized_at' => now(),
            'revoked_at' => now(),
        ]);

        $ticket = CtxAuthorizationTicket::query()->create([
            'jti' => 'phase8-revoked-static-host-ticket',
            'user_id' => $viewer->getKey(),
            'viewer_device_id' => $device->getKey(),
            'signing_kid' => app(TicketSigningKeyLifecycle::class)->stage()->kid,
            'ticket_sha256' => hash('sha256', 'phase8-revoked-static-host-ticket'),
            'broker' => 'http://localhost:3004',
            'capsule_id' => $capsuleId,
            'capsule_revision' => 1,
            'policy_sha256' => $policySha256,
            'payload_id' => 'primary',
            'release_handle' => $releaseHandle,
            'proof_jkt' => $device->proof_jkt,
            'agreement_jkt' => $device->agreement_jkt,
            'status' => 'pending',
            'issued_at' => now(),
            'expires_at' => now()->addMinute(),
        ]);

        $result = app(CtxTicketRedemptionService::class)->redeem($ticket->jti, $ticket->ticket_sha256);

        $this->assertSame(TicketRedemptionCode::PolicyUnsatisfied, $result->code);
        $this->assertSame('pending', $ticket->fresh()->status);
        $this->assertDatabaseCount('ctx_capsule_release_counters', 0);
    }

    public function test_static_host_bulk_page_safety_fixture_documents_hidden_queue_retry_and_counter_boundaries(): void
    {
        $page = file_get_contents(base_path('../_examples/static-host/test.html'));
        $readme = file_get_contents(base_path('../_examples/static-host/README.md'));

        $this->assertStringContainsString('id="bulk-page-safety"', $page);
        $this->assertStringContainsString('Accordion panel that starts open', $page);
        $this->assertStringContainsString('Accordion panel that starts closed', $page);
        $this->assertStringContainsString('Tab or modal panel that starts hidden', $page);
        $this->assertStringContainsString('data-demo-hidden-panel="true"', $page);
        $this->assertStringContainsString('Same-page queue', $page);
        $this->assertStringContainsString('retry action available', $page);
        $this->assertStringContainsString('No surprise release consumption', $page);
        $this->assertStringContainsString('successful broker key release', $page);
        $this->assertStringContainsString('counts as an opening', $page);
        $this->assertStringContainsString('./capsules/tekfoundry-logo.capsule', $page);
        $this->assertStringContainsString('./capsules/eclipse-photo.capsule', $page);
        $this->assertStringContainsString('./capsules/limit-capsule-per-account-limit-of-5.capsule', $page);

        $this->assertStringContainsString('Bulk-page safety check', $readme);
        $this->assertStringContainsString('accordion panel that starts closed', $readme);
        $this->assertStringContainsString('same-page queueing', $readme);
        $this->assertStringContainsString('No committed release should be created', $readme);
        $this->assertStringContainsString('Only a successful broker key release counts as an opening', $readme);
    }

    public function test_static_host_cross_origin_permission_fixture_documents_distinct_origin_grants(): void
    {
        $page = file_get_contents(base_path('../_examples/static-host/cross-origin-permissions.html'));
        $readme = file_get_contents(base_path('../_examples/static-host/README.md'));

        $this->assertStringContainsString('Cross-origin Capsule host test', $page);
        $this->assertStringContainsString('distinct runtime Host permissions', $page);
        $this->assertStringContainsString('https://capsules.example.test/phase8/tekfoundry-logo.capsule', $page);
        $this->assertStringContainsString('redirect-to-tekfoundry-logo.capsule', $page);
        $this->assertStringContainsString('granting only the page origin', $page);
        $this->assertStringContainsString('redirected origin', $page);

        $this->assertStringContainsString('cross-origin-permissions.html', $readme);
        $this->assertStringContainsString('Cross-origin Host permission check', $readme);
        $this->assertStringContainsString('granting the page origin does not authorize fetching a Capsule from a separate origin', $readme);
        $this->assertStringContainsString('a redirect to a third Capsule origin stops before the final fetch', $readme);
    }

    public function test_static_host_readme_documents_representative_accountless_deployment(): void
    {
        $readme = file_get_contents(base_path('../_examples/static-host/README.md'));
        $plan = file_get_contents(base_path('../_docs/plans/initial-mvp.md'));

        $this->assertStringContainsString('Representative static Host deployment: GitHub Pages', $readme);
        $this->assertStringContainsString('same public Pages site', $readme);
        $this->assertStringContainsString('anonymous `GET` and `HEAD`', $readme);
        $this->assertStringContainsString('does not need Share Capsules accounts', $readme);
        $this->assertStringContainsString('viewer accounts on the Host', $readme);
        $this->assertStringContainsString('cookies, server-side code, plugins', $readme);
        $this->assertStringContainsString('a database, CTX logic, broker credentials', $readme);
        $this->assertStringContainsString('private-repository redirects, signed URLs, login walls, cookies, or viewer GitHub accounts', $readme);
        $this->assertStringContainsString('stable revisioned Capsule filenames or paths', $readme);
        $this->assertStringContainsString('bounded `Content-Length`', $readme);
        $this->assertStringContainsString('public noncredentialed CORS', $readme);
        $this->assertStringContainsString('Phase 11 validation', $readme);

        $this->assertStringContainsString('✅ Document deployment to at least one representative static Host', $plan);
        $this->assertStringContainsString('GitHub Pages-style deployment', $plan);
        $this->assertStringContainsString('Host viewer accounts, cookies', $plan);
        $this->assertStringContainsString('server-side code, plugins, databases, CTX logic, broker credentials', $plan);
    }

    /**
     * @return array{User, ViewerDevice}
     */
    private function viewerIdentity(): array
    {
        $viewer = User::factory()->create(['email_verified_at' => now()]);
        $device = ViewerDevice::query()->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $viewer->getKey(),
            'name' => 'Phase 8 Viewer',
            'proof_public_key' => $this->digest(),
            'proof_jkt' => $this->digest(),
            'agreement_public_key' => $this->digest(),
            'agreement_jkt' => $this->digest(),
            'status' => ViewerDeviceStatus::Active,
        ]);

        return [$viewer, $device];
    }

    private function digest(): string
    {
        return sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }
}
