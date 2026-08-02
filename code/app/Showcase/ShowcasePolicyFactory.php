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
        $policy = match ($slug) {
            ShowcaseExamples::OPEN_IMAGE,
            ShowcaseExamples::REVOKED => $this->basePolicy(),
            ShowcaseExamples::TIME_FUTURE => $this->withRequirements([
                [
                    'predicate' => 'ctx.time.capsule-access-window',
                    'not_before' => $this->instant($now->addDays(2)),
                ],
            ]),
            ShowcaseExamples::TIME_OPEN => $this->withRequirements([
                [
                    'predicate' => 'ctx.time.capsule-access-window',
                    'not_before' => $this->instant($now->subDay()),
                    'not_after' => $this->instant($now->addDays(2)),
                ],
            ]),
            ShowcaseExamples::TIME_EXPIRED => $this->withRequirements([
                [
                    'predicate' => 'ctx.time.capsule-access-window',
                    'not_after' => $this->instant($now->subDays(2)),
                ],
            ]),
            ShowcaseExamples::LIMIT => $this->withRequirements([
                [
                    'predicate' => 'ctx.usage.capsule-lifetime-limit',
                    'scope' => 'capsule',
                    'maximum' => self::GENEROUS_LIMIT,
                ],
            ]),
            default => throw new InvalidArgumentException("Unknown showcase policy [{$slug}]."),
        };

        CtxPolicyV1::parse($policy);

        return $policy;
    }

    /**
     * @param  list<array<string, mixed>>  $requirements
     * @return array{type: string, version: int, combiner: string, requirements: list<array<string, mixed>>}
     */
    private function withRequirements(array $requirements): array
    {
        return [
            ...$this->basePolicy(),
            'requirements' => [
                ...$this->mandatoryRequirements(),
                ...$requirements,
            ],
        ];
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
