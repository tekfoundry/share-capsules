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
use App\Ctx\Tickets\TicketIssuanceFailed;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ctx\AuthorizeCtxRequest;
use App\Models\User;
use App\Models\ViewerDevice;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Throwable;

final class AuthorizeCtxController extends Controller
{
    public function __invoke(
        AuthorizeCtxRequest $request,
        CtxAuthorizationService $authorization,
        CtxMetricRecorder $metrics,
        MetricEventIdentifierSource $metricIdentifiers,
        AutomationRiskActivityRecorder $riskActivity,
    ): JsonResponse {
        $keys = array_keys($request->all());
        sort($keys);
        if ($keys !== [
            'action', 'broker', 'capsule_id', 'capsule_revision', 'cryptographic_suite',
            'payload_id', 'policy', 'policy_sha256', 'release_handle', 'type', 'version',
            'view_event_consent',
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

        try {
            $ticket = $authorization->authorize(
                $user,
                $device,
                $request->array('policy'),
                $request->string('policy_sha256')->toString(),
                $request->string('broker')->toString(),
                $request->string('capsule_id')->toString(),
                $request->integer('capsule_revision'),
                $request->string('payload_id')->toString(),
                $request->string('release_handle')->toString(),
                $request->boolean('view_event_consent'),
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
            'expires_in' => 60,
        ], 201, ['Cache-Control' => 'no-store']);
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
