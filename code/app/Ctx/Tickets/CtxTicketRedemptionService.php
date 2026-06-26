<?php

namespace App\Ctx\Tickets;

use App\Capsules\Registry\CapsuleLifecycleStatus;
use App\Ctx\Challenges\ChallengeAttemptContext;
use App\Ctx\Challenges\ChallengeEvidenceRepository;
use App\Ctx\Metrics\CtxMetricEvent;
use App\Ctx\Metrics\CtxMetricEventType;
use App\Ctx\Metrics\CtxMetricRecorder;
use App\Ctx\Policy\AutomationRiskEvaluator;
use App\Ctx\Risk\AutomationRiskActivityRecorder;
use App\Ctx\Risk\AutomationRiskActivityType;
use App\Ctx\Trust\TrustCapsuleOutcome;
use App\Ctx\Trust\TrustCapsuleOutcomeCombiner;
use App\Ctx\Trust\TrustScore;
use App\Models\CreatorCapsule;
use App\Models\CtxAccountCapsuleReleaseCounter;
use App\Models\CtxAuthorizationTicket;
use App\Models\CtxCapsuleReleaseCounter;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final readonly class CtxTicketRedemptionService
{
    public function __construct(
        private AutomationRiskEvaluator $automationRisk,
        private TrustCapsuleOutcomeCombiner $trustOutcomes,
        private ChallengeEvidenceRepository $challengeEvidence,
        private CtxMetricRecorder $metrics,
        private AutomationRiskActivityRecorder $riskActivity,
    ) {}

    public function redeem(
        string $jti,
        string $ticketSha256,
        ?CarbonImmutable $now = null,
    ): TicketRedemptionResult {
        $now ??= CarbonImmutable::now();

        return DB::transaction(function () use ($jti, $ticketSha256, $now): TicketRedemptionResult {
            $ticket = CtxAuthorizationTicket::query()->lockForUpdate()->find($jti);
            if (! $ticket instanceof CtxAuthorizationTicket
                || ! hash_equals($ticket->ticket_sha256, $ticketSha256)) {
                return $this->result(TicketRedemptionCode::Invalid);
            }
            if ($ticket->status === 'redeemed') {
                return $this->result(TicketRedemptionCode::AlreadyCommitted);
            }
            if ($ticket->status !== 'pending') {
                $this->recordRejection($ticket, TicketRedemptionCode::Replayed, $now);

                return $this->result(TicketRedemptionCode::Replayed);
            }
            if ($ticket->expires_at->lessThan($now)) {
                $this->recordRejection($ticket, TicketRedemptionCode::Expired, $now);

                return $this->result(TicketRedemptionCode::Expired);
            }
            $user = User::query()->lockForUpdate()->find($ticket->user_id);
            if (! $user instanceof User || $user->isClosed()) {
                $this->recordRejection($ticket, TicketRedemptionCode::AccountUnavailable, $now);

                return $this->result(TicketRedemptionCode::AccountUnavailable);
            }
            $device = ViewerDevice::query()->lockForUpdate()->find($ticket->viewer_device_id);
            if (! $device instanceof ViewerDevice || $device->status !== ViewerDeviceStatus::Active
                || (string) $device->user_id !== (string) $user->getKey()
                || ! hash_equals($device->proof_jkt, $ticket->proof_jkt)
                || ! hash_equals($device->agreement_jkt, $ticket->agreement_jkt)) {
                $this->recordRejection($ticket, TicketRedemptionCode::DeviceUnavailable, $now);

                return $this->result(TicketRedemptionCode::DeviceUnavailable);
            }
            if (($ticket->not_before !== null && $now->lessThan($ticket->not_before))
                || ($ticket->not_after !== null && ! $now->lessThan($ticket->not_after))) {
                $this->recordRejection($ticket, TicketRedemptionCode::PolicyUnsatisfied, $now);

                return $this->result(TicketRedemptionCode::PolicyUnsatisfied);
            }
            $registeredCapsule = CreatorCapsule::query()
                ->where('capsule_id', $ticket->capsule_id)
                ->where('capsule_revision', $ticket->capsule_revision)
                ->where('payload_id', $ticket->payload_id)
                ->where('broker', $ticket->broker)
                ->where('release_handle', $ticket->release_handle)
                ->where('policy_sha256', $ticket->policy_sha256)
                ->where('status', CapsuleLifecycleStatus::Active->value)
                ->lockForUpdate()
                ->first();
            if (! $registeredCapsule instanceof CreatorCapsule) {
                $this->recordRejection($ticket, TicketRedemptionCode::PolicyUnsatisfied, $now);

                return $this->result(TicketRedemptionCode::PolicyUnsatisfied);
            }
            CtxCapsuleReleaseCounter::query()->insertOrIgnore([
                'capsule_id' => $ticket->capsule_id,
                'capsule_revision' => $ticket->capsule_revision,
                'committed_releases' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            CtxAccountCapsuleReleaseCounter::query()->insertOrIgnore([
                'user_id' => $user->getKey(),
                'capsule_id' => $ticket->capsule_id,
                'capsule_revision' => $ticket->capsule_revision,
                'committed_releases' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $capsule = CtxCapsuleReleaseCounter::query()
                ->where('capsule_id', $ticket->capsule_id)
                ->where('capsule_revision', $ticket->capsule_revision)
                ->lockForUpdate()->firstOrFail();
            $account = CtxAccountCapsuleReleaseCounter::query()
                ->where('user_id', $user->getKey())
                ->where('capsule_id', $ticket->capsule_id)
                ->where('capsule_revision', $ticket->capsule_revision)
                ->lockForUpdate()->firstOrFail();
            if ($ticket->capsule_lifetime_limit !== null
                && $capsule->committed_releases >= $ticket->capsule_lifetime_limit) {
                $this->recordRejection($ticket, TicketRedemptionCode::CapsuleLimitReached, $now);

                return $this->result(TicketRedemptionCode::CapsuleLimitReached);
            }
            if ($ticket->account_capsule_lifetime_limit !== null
                && $account->committed_releases >= $ticket->account_capsule_lifetime_limit) {
                $this->recordRejection($ticket, TicketRedemptionCode::AccountCapsuleLimitReached, $now);

                return $this->result(TicketRedemptionCode::AccountCapsuleLimitReached);
            }
            if ($ticket->automation_risk_issuer !== null) {
                $risk = $this->automationRisk->assessUsage($user, $ticket->automation_risk_issuer);
                if ($risk->severeUsageRisk()) {
                    if (is_string($ticket->host_origin) && is_string($ticket->action)) {
                        $this->challengeEvidence->resetFor(
                            $user,
                            $device,
                            new ChallengeAttemptContext(
                                hostOrigin: $ticket->host_origin,
                                broker: $ticket->broker,
                                capsuleId: $ticket->capsule_id,
                                capsuleRevision: $ticket->capsule_revision,
                                policySha256: $ticket->policy_sha256,
                                payloadId: $ticket->payload_id,
                                releaseHandle: $ticket->release_handle,
                                action: $ticket->action,
                            ),
                            'high_automation_risk',
                            $now,
                        );
                    }
                    $this->recordRejection($ticket, TicketRedemptionCode::AutomationRiskHigh, $now);

                    return $this->result(TicketRedemptionCode::AutomationRiskHigh);
                }
                if ($risk->unavailable()) {
                    $this->recordRejection($ticket, TicketRedemptionCode::PolicyUnsatisfied, $now);

                    return $this->result(TicketRedemptionCode::PolicyUnsatisfied);
                }
                if (! is_string($ticket->host_origin) || ! is_string($ticket->action)) {
                    $this->recordRejection($ticket, TicketRedemptionCode::PolicyUnsatisfied, $now);

                    return $this->result(TicketRedemptionCode::PolicyUnsatisfied);
                }
                $challenge = $this->challengeEvidence->currentFor(
                    $user,
                    $device,
                    new ChallengeAttemptContext(
                        hostOrigin: $ticket->host_origin,
                        broker: $ticket->broker,
                        capsuleId: $ticket->capsule_id,
                        capsuleRevision: $ticket->capsule_revision,
                        policySha256: $ticket->policy_sha256,
                        payloadId: $ticket->payload_id,
                        releaseHandle: $ticket->release_handle,
                        action: $ticket->action,
                    ),
                    $now,
                );
                $trust = $this->trustOutcomes->assess(
                    usageScore: $risk->usageScore,
                    usageConfidence: $risk->usageConfidence,
                    challengeScore: $challenge?->score ?? TrustScore::zero(),
                    lastChallengedAt: $challenge?->lastChallengedAt,
                    challengeExpiresAt: $challenge?->expiresAt,
                    now: $now,
                );
                if ($trust->finalOutcome !== TrustCapsuleOutcome::Allow) {
                    $this->recordRejection($ticket, TicketRedemptionCode::PolicyUnsatisfied, $now);

                    return $this->result(TicketRedemptionCode::PolicyUnsatisfied);
                }
            }
            $capsule->increment('committed_releases');
            $account->increment('committed_releases');
            $ticket->forceFill(['status' => 'redeemed', 'redeemed_at' => $now])->save();
            $this->metrics->record($this->event(
                $ticket,
                CtxMetricEventType::RedemptionCommitted,
                CtxMetricEvent::deterministicIdentifier('redemption-committed', $ticket->jti),
                $now,
            ));
            $this->riskActivity->recordTicket(
                AutomationRiskActivityType::RedemptionCommitted,
                $ticket,
                $now,
            );

            return $this->result(TicketRedemptionCode::Committed);
        }, 3);
    }

    private function result(TicketRedemptionCode $code): TicketRedemptionResult
    {
        return new TicketRedemptionResult($code);
    }

    private function recordRejection(
        CtxAuthorizationTicket $ticket,
        TicketRedemptionCode $code,
        CarbonImmutable $occurredAt,
    ): void {
        $this->metrics->record($this->event(
            $ticket,
            CtxMetricEventType::TicketRejected,
            CtxMetricEvent::deterministicIdentifier('ticket-rejected', $ticket->jti.'\0'.$code->value),
            $occurredAt,
        ));
        if (in_array($code, [TicketRedemptionCode::Replayed, TicketRedemptionCode::Expired], true)) {
            $this->riskActivity->recordTicket(
                AutomationRiskActivityType::TicketRejected,
                $ticket,
                $occurredAt,
            );
        }
    }

    private function event(
        CtxAuthorizationTicket $ticket,
        CtxMetricEventType $type,
        string $eventId,
        CarbonImmutable $occurredAt,
    ): CtxMetricEvent {
        return new CtxMetricEvent(
            eventId: $eventId,
            type: $type,
            provider: (string) config('sharecapsules.ctx.issuer'),
            broker: $ticket->broker,
            capsuleId: $ticket->capsule_id,
            capsuleRevision: $ticket->capsule_revision,
            occurredAt: $occurredAt,
        );
    }
}
