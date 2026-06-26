<?php

namespace App\Http\Controllers\Ctx;

use App\Ctx\Contracts\CtxErrorCode;
use App\Ctx\Metrics\CreatorSafeDenialCategory;
use App\Ctx\Metrics\CtxMetricEvent;
use App\Ctx\Metrics\CtxMetricEventType;
use App\Ctx\Metrics\CtxMetricRecorder;
use App\Ctx\Metrics\MetricEventIdentifierSource;
use App\Ctx\Policy\UnsupportedCtxPolicy;
use App\Ctx\Risk\AutomationRiskActivityRecorder;
use App\Ctx\Risk\AutomationRiskActivityType;
use App\Ctx\Tickets\CtxAuthorizationDenied;
use App\Ctx\Tickets\CtxAuthorizationService;
use App\Ctx\Tickets\IssuedCtxTicket;
use App\Ctx\Tickets\TicketIssuanceFailed;
use App\Ctx\ViewerCompatibility\ViewerCompatibilityPolicy;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ctx\AuthorizeCtxRequest;
use App\Models\User;
use App\Models\ViewerDevice;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

final class AuthorizeCtxController extends Controller
{
    private const IDEMPOTENCY_WINDOW_SECONDS = 3;

    public function __invoke(
        AuthorizeCtxRequest $request,
        CtxAuthorizationService $authorization,
        CtxMetricRecorder $metrics,
        MetricEventIdentifierSource $metricIdentifiers,
        AutomationRiskActivityRecorder $riskActivity,
        ViewerCompatibilityPolicy $viewerCompatibility,
    ): JsonResponse {
        $keys = array_keys($request->all());
        sort($keys);
        if ($keys !== [
            'action', 'broker', 'capsule_id', 'capsule_revision', 'cryptographic_suite', 'host_origin',
            'payload_id', 'policy', 'policy_sha256', 'release_handle', 'type', 'version',
            'view_event_consent', 'viewer',
        ]) {
            return $this->error(CtxErrorCode::InvalidRequest, 422);
        }
        $user = $request->user();
        $deviceId = $user?->token()?->getAttribute('viewer_device_id');
        $device = is_string($deviceId) ? ViewerDevice::query()->find($deviceId) : null;
        if (! $user instanceof User || ! $device instanceof ViewerDevice) {
            return $this->error(CtxErrorCode::AuthenticationRequired, 401);
        }

        $occurredAt = CarbonImmutable::now();
        $this->recordRiskActivity(
            $riskActivity,
            AutomationRiskActivityType::AuthorizationAttempted,
            $user,
            $device,
            $request,
            $occurredAt,
        );
        $this->recordMetric(
            $metrics,
            $metricIdentifiers,
            CtxMetricEventType::AuthorizationAttempted,
            $request,
            $occurredAt,
        );

        if (! $viewerCompatibility->accepts($request->array('viewer'))) {
            $this->recordMetric($metrics, $metricIdentifiers, CtxMetricEventType::AuthorizationDenied, $request, $occurredAt, 'unsupported_contract');

            return $this->error(CtxErrorCode::UnsupportedContract, 422);
        }

        try {
            $ticket = $this->authorizeWithShortWindowIdempotency(
                $authorization,
                $user,
                $device,
                $request,
            );
        } catch (UnsupportedCtxPolicy) {
            $this->recordMetric($metrics, $metricIdentifiers, CtxMetricEventType::AuthorizationDenied, $request, $occurredAt, 'unsupported_contract');

            return $this->error(CtxErrorCode::UnsupportedContract, 422);
        } catch (CtxAuthorizationDenied $denied) {
            $this->recordMetric($metrics, $metricIdentifiers, CtxMetricEventType::AuthorizationDenied, $request, $occurredAt, $denied->reason->value);

            return $this->error(CtxErrorCode::from($denied->reason->value), 403);
        } catch (TicketIssuanceFailed) {
            $this->recordMetric($metrics, $metricIdentifiers, CtxMetricEventType::AuthorizationDenied, $request, $occurredAt, 'temporarily_unavailable');

            return $this->error(CtxErrorCode::TemporarilyUnavailable, 503, true);
        } catch (Throwable) {
            $this->recordMetric($metrics, $metricIdentifiers, CtxMetricEventType::AuthorizationDenied, $request, $occurredAt, 'temporarily_unavailable');

            return $this->error(CtxErrorCode::TemporarilyUnavailable, 503, true);
        }

        $this->recordMetric(
            $metrics,
            $metricIdentifiers,
            CtxMetricEventType::AuthorizationApproved,
            $request,
            $occurredAt,
        );

        return response()->json([
            'type' => 'ctx-authorization',
            'version' => 1,
            'ticket' => $ticket->compact,
            'expires_in' => max(1, $ticket->expiresAt->getTimestamp() - CarbonImmutable::now()->getTimestamp()),
        ], 201, ['Cache-Control' => 'no-store']);
    }

    private function authorizeWithShortWindowIdempotency(
        CtxAuthorizationService $authorization,
        User $user,
        ViewerDevice $device,
        AuthorizeCtxRequest $request,
    ): IssuedCtxTicket {
        $cacheKey = $this->authorizationTicketCacheKey($user, $device, $request);

        try {
            return Cache::lock($cacheKey.':lock', 5)->block(5, function () use (
                $authorization,
                $user,
                $device,
                $request,
                $cacheKey,
            ): IssuedCtxTicket {
                $cached = Cache::get($cacheKey);
                if ($ticket = $this->ticketFromCache($cached)) {
                    return $ticket;
                }

                $ticket = $authorization->authorize(
                    $user,
                    $device,
                    $request->array('policy'),
                    $request->string('policy_sha256')->toString(),
                    $request->string('host_origin')->toString(),
                    $request->string('broker')->toString(),
                    $request->string('capsule_id')->toString(),
                    $request->integer('capsule_revision'),
                    $request->string('payload_id')->toString(),
                    $request->string('release_handle')->toString(),
                    $request->boolean('view_event_consent'),
                );
                Cache::put($cacheKey, [
                    'compact' => $ticket->compact,
                    'identifier' => $ticket->identifier,
                    'expires_at' => $ticket->expiresAt->toIso8601String(),
                ], CarbonImmutable::now()->addSeconds(self::IDEMPOTENCY_WINDOW_SECONDS));

                return $ticket;
            });
        } catch (LockTimeoutException) {
            throw new TicketIssuanceFailed('The CTX authorization request could not be safely serialized.');
        }
    }

    private function authorizationTicketCacheKey(
        User $user,
        ViewerDevice $device,
        AuthorizeCtxRequest $request,
    ): string {
        return 'ctx:authorization-ticket:'.hash('sha256', json_encode([
            'user_id' => (string) $user->getKey(),
            'viewer_device_id' => (string) $device->getKey(),
            'proof_jkt' => $device->proof_jkt,
            'agreement_jkt' => $device->agreement_jkt,
            'type' => $request->string('type')->toString(),
            'version' => $request->integer('version'),
            'broker' => $request->string('broker')->toString(),
            'host_origin' => $request->string('host_origin')->toString(),
            'capsule_id' => $request->string('capsule_id')->toString(),
            'capsule_revision' => $request->integer('capsule_revision'),
            'policy_sha256' => $request->string('policy_sha256')->toString(),
            'policy' => $request->array('policy'),
            'payload_id' => $request->string('payload_id')->toString(),
            'release_handle' => $request->string('release_handle')->toString(),
            'action' => $request->string('action')->toString(),
            'cryptographic_suite' => $request->string('cryptographic_suite')->toString(),
            'view_event_consent' => $request->boolean('view_event_consent'),
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));
    }

    private function ticketFromCache(mixed $cached): ?IssuedCtxTicket
    {
        if (! is_array($cached)) {
            return null;
        }
        if (
            ! is_string($cached['compact'] ?? null)
            || ! is_string($cached['identifier'] ?? null)
            || ! is_string($cached['expires_at'] ?? null)
        ) {
            return null;
        }
        $expiresAt = CarbonImmutable::parse($cached['expires_at']);
        if (! $expiresAt->isFuture()) {
            return null;
        }

        return new IssuedCtxTicket($cached['compact'], $cached['identifier'], $expiresAt);
    }

    private function recordRiskActivity(
        AutomationRiskActivityRecorder $activity,
        AutomationRiskActivityType $type,
        User $user,
        ViewerDevice $device,
        AuthorizeCtxRequest $request,
        CarbonImmutable $occurredAt,
    ): void {
        try {
            $activity->record(
                $type,
                $user,
                $device,
                $request->string('capsule_id')->toString(),
                $request->integer('capsule_revision'),
                $occurredAt,
            );
        } catch (Throwable $exception) {
            Log::error('ctx.risk.activity_recording_failed', [
                'activity_type' => $type->value,
                'exception' => $exception,
            ]);
        }
    }

    private function error(CtxErrorCode $code, int $status, bool $retryable = false): JsonResponse
    {
        return response()->json([
            'type' => 'ctx-error',
            'version' => 1,
            'code' => $code->value,
            'retryable' => $retryable,
        ], $status, ['Cache-Control' => 'no-store']);
    }

    private function recordMetric(
        CtxMetricRecorder $metrics,
        MetricEventIdentifierSource $identifiers,
        CtxMetricEventType $type,
        AuthorizeCtxRequest $request,
        CarbonImmutable $occurredAt,
        ?string $denialCode = null,
    ): void {
        try {
            $metrics->record(new CtxMetricEvent(
                eventId: $identifiers->identifier(),
                type: $type,
                provider: (string) config('sharecapsules.ctx.issuer'),
                broker: $request->string('broker')->toString(),
                capsuleId: $request->string('capsule_id')->toString(),
                capsuleRevision: $request->integer('capsule_revision'),
                occurredAt: $occurredAt,
                denialCategory: $denialCode === null
                    ? null
                    : CreatorSafeDenialCategory::fromProtocolCode($denialCode),
            ));
        } catch (Throwable $exception) {
            Log::error('ctx.metrics.authorization_recording_failed', [
                'event_type' => $type->value,
                'exception' => $exception,
            ]);
        }
    }
}
