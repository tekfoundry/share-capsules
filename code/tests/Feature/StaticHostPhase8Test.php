<?php

namespace Tests\Feature;

use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Ctx\Challenges\ChallengeAttemptContext;
use App\Ctx\Challenges\ChallengeAttemptOrchestrator;
use App\Ctx\Policy\CtxPolicyDigest;
use App\Ctx\Policy\PolicyDecisionCode;
use App\Ctx\Risk\AutomationRiskActivityType;
use App\Ctx\Risk\V1AutomationRiskRules;
use App\Ctx\SigningKeys\TicketSigningKeyLifecycle;
use App\Ctx\Tickets\CtxAuthorizationDenied;
use App\Ctx\Tickets\CtxAuthorizationService;
use App\Ctx\Tickets\CtxTicketBindings;
use App\Ctx\Tickets\CtxTicketRedemptionService;
use App\Ctx\Tickets\ReleaseBindingVerifier;
use App\Ctx\Tickets\TicketRedemptionCode;
use App\Models\CreatorCapsule;
use App\Models\CtxAuthorizationTicket;
use App\Models\CtxAutomationRiskActivity;
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

    public function test_static_host_trust_capsule_fixture_challenges_opens_after_success_and_blocks_high_risk(): void
    {
        config()->set('sharecapsules.broker.base_url', 'http://localhost:3004');
        $this->app->instance(ReleaseBindingVerifier::class, new class implements ReleaseBindingVerifier
        {
            public function valid(CtxTicketBindings $bindings): bool
            {
                return true;
            }
        });
        $key = app(TicketSigningKeyLifecycle::class)->stage();
        app(TicketSigningKeyLifecycle::class)->activate($key->kid);
        $creator = User::factory()->create(['email_verified_at' => now()]);
        [$viewer, $device] = $this->viewerIdentity();
        [$policy, $payload] = $this->trustCapsuleFixturePayload();
        $this->activeCapsule($creator, $payload, $policy);
        $authorization = app(CtxAuthorizationService::class);

        try {
            $authorization->authorize(
                $viewer,
                $device,
                $policy,
                $payload['policy_sha256'],
                $payload['host_origin'],
                $payload['broker'],
                $payload['capsule_id'],
                $payload['capsule_revision'],
                $payload['payload_id'],
                $payload['release_handle'],
                true,
            );
            $this->fail('A low-history Trust Capsule viewer should receive a challenge first.');
        } catch (CtxAuthorizationDenied $denied) {
            $this->assertSame(PolicyDecisionCode::ChallengeRequired, $denied->reason);
        }

        $attempt = app(ChallengeAttemptOrchestrator::class)->create(
            $viewer,
            $device,
            new ChallengeAttemptContext(
                hostOrigin: $payload['host_origin'],
                broker: $payload['broker'],
                capsuleId: $payload['capsule_id'],
                capsuleRevision: $payload['capsule_revision'],
                policySha256: $payload['policy_sha256'],
                payloadId: $payload['payload_id'],
                releaseHandle: $payload['release_handle'],
                action: $payload['action'],
            ),
        );
        $module = $attempt->modules()->firstOrFail();
        app(ChallengeAttemptOrchestrator::class)->recordModuleScore($attempt, $module->challenge_id, 80, ['completed']);

        $issued = $authorization->authorize(
            $viewer,
            $device,
            $policy,
            $payload['policy_sha256'],
            $payload['host_origin'],
            $payload['broker'],
            $payload['capsule_id'],
            $payload['capsule_revision'],
            $payload['payload_id'],
            $payload['release_handle'],
            true,
        );
        $this->assertSame(
            TicketRedemptionCode::Committed,
            app(CtxTicketRedemptionService::class)
                ->redeem($issued->identifier, hash('sha256', $issued->compact))
                ->code,
        );

        $secondTicket = $authorization->authorize(
            $viewer,
            $device,
            $policy,
            $payload['policy_sha256'],
            $payload['host_origin'],
            $payload['broker'],
            $payload['capsule_id'],
            $payload['capsule_revision'],
            $payload['payload_id'],
            $payload['release_handle'],
            true,
        );
        $this->recordHighAutomationRisk($viewer, $device, $payload['capsule_id'], $payload['capsule_revision']);

        try {
            $authorization->authorize(
                $viewer,
                $device,
                $policy,
                $payload['policy_sha256'],
                $payload['host_origin'],
                $payload['broker'],
                $payload['capsule_id'],
                $payload['capsule_revision'],
                $payload['payload_id'],
                $payload['release_handle'],
                true,
            );
            $this->fail('High automation risk should block Trust Capsule authorization.');
        } catch (CtxAuthorizationDenied $denied) {
            $this->assertSame(PolicyDecisionCode::AutomationRiskHigh, $denied->reason);
        }

        $this->assertSame(
            TicketRedemptionCode::AutomationRiskHigh,
            app(CtxTicketRedemptionService::class)
                ->redeem($secondTicket->identifier, hash('sha256', $secondTicket->compact))
                ->code,
        );
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

    public function test_static_host_index_includes_policy_feature_tour(): void
    {
        $page = file_get_contents(base_path('../_examples/static-host/index.html'));

        $this->assertStringContainsString('Capsule policy feature tour', $page);
        $this->assertStringContainsString('One Capsule format, configurable access policies.', $page);
        $this->assertStringContainsString('Time Capsule', $page);
        $this->assertStringContainsString('Limit Capsule', $page);
        $this->assertStringContainsString('Trust Capsule', $page);
        $this->assertStringContainsString('Combined Capsule', $page);
        $this->assertStringContainsString('./test.html#time-capsule-in-between-before-and-after', $page);
        $this->assertStringContainsString('./test.html#limit-capsule-global-limit-of-15', $page);
        $this->assertStringContainsString('./test.html#trust-capsule', $page);
        $this->assertStringContainsString('./test.html#combined-capsule', $page);
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
        $this->assertStringContainsString('Phase 12 validation', $readme);

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

    /** @return array{array<string, mixed>, array<string, mixed>} */
    private function trustCapsuleFixturePayload(): array
    {
        $policy = [
            'type' => 'ctx-policy',
            'version' => 1,
            'combiner' => 'all',
            'requirements' => [
                ['predicate' => 'ctx.account.email-verified', 'equals' => true],
                ['predicate' => 'ctx.account.active', 'equals' => true],
                ['predicate' => 'ctx.viewer.device-registered', 'equals' => true],
                ['predicate' => 'ctx.consent.capsule-view-event', 'equals' => true],
                [
                    'predicate' => 'ctx.risk.ecosystem-automation-not-high',
                    'issuer' => (string) config('sharecapsules.ctx.issuer'),
                ],
            ],
        ];

        return [$policy, [
            'host_origin' => 'http://localhost:8088',
            'broker' => 'http://localhost:3004',
            'capsule_id' => 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
            'capsule_revision' => 1,
            'policy_sha256' => app(CtxPolicyDigest::class)->calculate($policy),
            'payload_id' => 'primary-image',
            'release_handle' => 'opaque-release-handle-0001',
            'action' => 'render',
        ]];
    }

    /** @param array<string, mixed> $payload */
    private function activeCapsule(User $creator, array $payload, array $policy): void
    {
        CreatorCapsule::query()->create([
            'user_id' => $creator->getKey(),
            'registration_id' => 'registration_'.str_repeat('b', 32),
            'capsule_id' => $payload['capsule_id'],
            'capsule_revision' => $payload['capsule_revision'],
            'payload_id' => $payload['payload_id'],
            'broker' => $payload['broker'],
            'release_handle' => $payload['release_handle'],
            'policy_sha256' => $payload['policy_sha256'],
            'policy' => $policy,
            'status' => CapsuleLifecycleStatus::Active,
            'pending_expires_at' => now(),
            'finalized_at' => now(),
        ]);
    }

    private function recordHighAutomationRisk(
        User $viewer,
        ViewerDevice $device,
        string $capsuleId,
        int $capsuleRevision,
    ): void {
        for ($index = 0; $index < V1AutomationRiskRules::TICKET_REJECTION_LIMIT; $index++) {
            CtxAutomationRiskActivity::query()->create([
                'event_id' => sodium_bin2base64(
                    hash('sha256', 'static-host-trust-rejection-'.$index, true),
                    SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
                ),
                'user_id' => $viewer->getKey(),
                'viewer_device_id' => $device->getKey(),
                'activity_type' => AutomationRiskActivityType::TicketRejected,
                'capsule_id' => $capsuleId,
                'capsule_revision' => $capsuleRevision,
                'occurred_at' => now(),
            ]);
        }
    }
}
