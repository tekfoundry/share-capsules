<?php

namespace Tests\Unit\Ctx;

use App\Ctx\Policy\CtxPolicyDigest;
use App\Ctx\Policy\PolicyDecisionCode;
use App\Ctx\Policy\PreliminaryPolicyEvaluator;
use App\Ctx\Tickets\CtxAuthorizationDenied;
use App\Ctx\Tickets\CtxAuthorizationService;
use App\Ctx\Tickets\CtxTicketBindings;
use App\Ctx\Tickets\CtxTicketIssuer;
use App\Ctx\Tickets\ReleaseBindingVerifier;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Tests\TestCase;

final class CtxAuthorizationServiceTest extends TestCase
{
    public function test_authorization_rejects_a_broker_other_than_the_configured_broker_identity(): void
    {
        config()->set('sharecapsules.broker.base_url', 'https://broker.example.test');

        $policy = $this->baselinePolicy();
        $service = new CtxAuthorizationService(
            app(CtxPolicyDigest::class),
            new class implements ReleaseBindingVerifier
            {
                public function valid(CtxTicketBindings $bindings): bool
                {
                    throw new \RuntimeException('Release binding verifier should not run for the wrong broker.');
                }
            },
            app(PreliminaryPolicyEvaluator::class),
            app(CtxTicketIssuer::class),
        );

        try {
            $service->authorize(
                user: new User(['email_verified_at' => now()]),
                device: new ViewerDevice([
                    'status' => ViewerDeviceStatus::Active,
                    'proof_jkt' => $this->digest(),
                    'agreement_jkt' => $this->digest(),
                ]),
                policyValue: $policy,
                presentedPolicySha256: app(CtxPolicyDigest::class)->calculate($policy),
                hostOrigin: 'https://host.example.test',
                broker: 'https://wrong-broker.example.test',
                capsuleId: 'urn:uuid:018f61fe-729b-4f87-8865-2e1f9d8db703',
                capsuleRevision: 1,
                payloadId: 'primary-image',
                releaseHandle: 'opaque-release-handle-0001',
                viewEventConsent: true,
            );

            $this->fail('Authorization should reject a broker that is not the configured broker identity.');
        } catch (CtxAuthorizationDenied $exception) {
            $this->assertSame(PolicyDecisionCode::PolicyUnsatisfied, $exception->reason);
        }
    }

    /** @return array<string, mixed> */
    private function baselinePolicy(): array
    {
        return [
            'type' => 'ctx-policy',
            'version' => 1,
            'combiner' => 'all',
            'requirements' => [
                ['predicate' => 'ctx.account.email-verified', 'equals' => true],
                ['predicate' => 'ctx.account.active', 'equals' => true],
                ['predicate' => 'ctx.viewer.device-registered', 'equals' => true],
                ['predicate' => 'ctx.consent.capsule-view-event', 'equals' => true],
            ],
        ];
    }

    private function digest(): string
    {
        return sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }
}
