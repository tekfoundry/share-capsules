<?php

namespace App\Showcase;

use App\Ctx\Policy\CtxPolicyV1;
use Carbon\CarbonImmutable;
use InvalidArgumentException;

final class ShowcasePolicyFactory
{
    private const GENEROUS_LIMIT = 1000;

    /**
     * @return array{type: string, version: int, combiner: string, requirements: list<array<string, mixed>>}
     */
    public function policyFor(string $slug, ?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now('UTC');
        $draftPolicy = $this->draftPolicyFor($slug, $now);
        $requirements = $this->mandatoryRequirements();
        $accessWindow = $draftPolicy['access_window'] ?? null;
        if (is_array($accessWindow)) {
            $requirements[] = [
                'predicate' => 'ctx.time.capsule-access-window',
                ...$accessWindow,
            ];
        }
        if (isset($draftPolicy['capsule_lifetime_maximum'])) {
            $requirements[] = [
                'predicate' => 'ctx.usage.capsule-lifetime-limit',
                'scope' => 'capsule',
                'maximum' => $draftPolicy['capsule_lifetime_maximum'],
            ];
        }
        if (($draftPolicy['automation_risk_required'] ?? false) === true) {
            $requirements[] = [
                'predicate' => 'ctx.risk.ecosystem-automation-not-high',
                'issuer' => (string) config('sharecapsules.ctx.issuer'),
            ];
        }
        $policy = match ($slug) {
            ShowcaseExamples::OPEN_IMAGE,
            ShowcaseExamples::REVOKED,
            ShowcaseExamples::TIME_FUTURE,
            ShowcaseExamples::TIME_OPEN,
            ShowcaseExamples::TIME_EXPIRED,
            ShowcaseExamples::LIMIT,
            ShowcaseExamples::TRUST => [
                ...$this->basePolicy(),
                'requirements' => $requirements,
            ],
            default => throw new InvalidArgumentException("Unknown showcase policy [{$slug}]."),
        };

        CtxPolicyV1::parse($policy);

        return $policy;
    }

    /**
     * @return array{
     *     automation_risk_required: bool,
     *     access_window?: array{not_before?: string, not_after?: string},
     *     capsule_lifetime_maximum?: int
     * }
     */
    public function draftPolicyFor(string $slug, ?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now('UTC');

        return match ($slug) {
            ShowcaseExamples::OPEN_IMAGE,
            ShowcaseExamples::REVOKED => [
                'automation_risk_required' => false,
            ],
            ShowcaseExamples::TIME_FUTURE => [
                'access_window' => [
                    'not_before' => $this->instant($now->addDays(2)),
                ],
                'automation_risk_required' => false,
            ],
            ShowcaseExamples::TIME_OPEN => [
                'access_window' => [
                    'not_before' => $this->instant($now->subDay()),
                    'not_after' => $this->instant($now->addDays(2)),
                ],
                'automation_risk_required' => false,
            ],
            ShowcaseExamples::TIME_EXPIRED => [
                'access_window' => [
                    'not_after' => $this->instant($now->subDays(2)),
                ],
                'automation_risk_required' => false,
            ],
            ShowcaseExamples::LIMIT => [
                'capsule_lifetime_maximum' => self::GENEROUS_LIMIT,
                'automation_risk_required' => false,
            ],
            ShowcaseExamples::TRUST => [
                'automation_risk_required' => true,
            ],
            default => throw new InvalidArgumentException("Unknown showcase policy [{$slug}]."),
        };
    }

    /**
     * @return array{type: string, version: int, combiner: string, requirements: list<array<string, mixed>>}
     */
    private function basePolicy(): array
    {
        return [
            'type' => 'ctx-policy',
            'version' => 1,
            'combiner' => 'all',
            'requirements' => $this->mandatoryRequirements(),
        ];
    }

    /** @return list<array{predicate: string, equals: true}> */
    private function mandatoryRequirements(): array
    {
        return [
            ['predicate' => 'ctx.account.email-verified', 'equals' => true],
            ['predicate' => 'ctx.account.active', 'equals' => true],
            ['predicate' => 'ctx.viewer.device-registered', 'equals' => true],
            ['predicate' => 'ctx.consent.capsule-view-event', 'equals' => true],
        ];
    }

    private function instant(CarbonImmutable $instant): string
    {
        return $instant->utc()->startOfSecond()->format('Y-m-d\TH:i:s\Z');
    }
}
