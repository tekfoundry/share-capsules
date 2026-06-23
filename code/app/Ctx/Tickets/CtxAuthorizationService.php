<?php

namespace App\Ctx\Tickets;

use App\Ctx\Policy\CtxPolicyDigest;
use App\Ctx\Policy\CtxPolicyV1;
use App\Ctx\Policy\PolicyDecisionCode;
use App\Ctx\Policy\PreliminaryPolicyEvaluator;
use App\Ctx\Policy\UnsupportedCtxPolicy;
use App\Models\User;
use App\Models\ViewerDevice;

final readonly class CtxAuthorizationService
{
    public function __construct(
        private CtxPolicyDigest $digests,
        private ReleaseBindingVerifier $releaseBindings,
        private PreliminaryPolicyEvaluator $policyEvaluator,
        private CtxTicketIssuer $tickets,
    ) {}

    /** @param array<string, mixed> $policyValue */
    public function authorize(
        User $user,
        ViewerDevice $device,
        array $policyValue,
        string $presentedPolicySha256,
        string $broker,
        string $capsuleId,
        int $capsuleRevision,
        string $payloadId,
        string $releaseHandle,
        bool $viewEventConsent,
    ): IssuedCtxTicket {
        $policy = CtxPolicyV1::parse($policyValue);
        if (! hash_equals($this->digests->calculate($policyValue), $presentedPolicySha256)) {
            throw new UnsupportedCtxPolicy('The CTX policy digest does not match.');
        }
        $bindings = new CtxTicketBindings(
            broker: $broker,
            capsuleId: $capsuleId,
            capsuleRevision: $capsuleRevision,
            policySha256: $presentedPolicySha256,
            payloadId: $payloadId,
            releaseHandle: $releaseHandle,
            proofJkt: $device->proof_jkt,
            agreementJkt: $device->agreement_jkt,
            notBefore: $policy->notBefore,
            notAfter: $policy->notAfter,
            capsuleLifetimeLimit: $policy->capsuleLifetimeLimit,
            accountCapsuleLifetimeLimit: $policy->accountCapsuleLifetimeLimit,
            automationRiskIssuer: $policy->automationRiskIssuer,
        );
        if (! hash_equals((string) config('sharecapsules.broker.base_url'), $broker)
            || ! $this->releaseBindings->valid($bindings)) {
            throw new CtxAuthorizationDenied(PolicyDecisionCode::PolicyUnsatisfied);
        }
        $decision = $this->policyEvaluator->evaluate(
            $policy,
            $user,
            $device,
            $capsuleId,
            $capsuleRevision,
            $viewEventConsent,
        );
        if (! $decision->allowed()) {
            throw new CtxAuthorizationDenied($decision->code);
        }

        return $this->tickets->issue($user, $device, $bindings);
    }
}
