<?php

namespace Tests\Unit\Showcase;

use App\Ctx\Policy\CtxPolicyDigest;
use App\Ctx\Policy\CtxPolicyV1;
use App\Showcase\ShowcaseExamples;
use App\Showcase\ShowcasePolicyFactory;
use Carbon\CarbonImmutable;
use InvalidArgumentException;
use Tests\TestCase;

final class ShowcasePolicyFactoryTest extends TestCase
{
    public function test_it_builds_valid_policy_for_every_showcase_example(): void
    {
        $factory = new ShowcasePolicyFactory;
        $now = CarbonImmutable::parse('2026-08-01T12:34:56Z');
        $digest = new CtxPolicyDigest;

        foreach (ShowcaseExamples::all() as $example) {
            $policy = $factory->policyFor($example['slug'], $now);

            CtxPolicyV1::parse($policy);
            $this->assertNotSame('', $digest->calculate($policy));
        }
    }

    public function test_open_and_revoked_examples_use_base_policy(): void
    {
        $factory = new ShowcasePolicyFactory;
        $now = CarbonImmutable::parse('2026-08-01T12:34:56Z');

        $open = $factory->policyFor(ShowcaseExamples::OPEN_IMAGE, $now);
        $revoked = $factory->policyFor(ShowcaseExamples::REVOKED, $now);

        $this->assertSame($open, $revoked);
        $this->assertCount(4, $open['requirements']);
    }

    public function test_time_examples_use_relative_showcase_windows(): void
    {
        $factory = new ShowcasePolicyFactory;
        $now = CarbonImmutable::parse('2026-08-01T12:34:56Z');

        $future = $factory->policyFor(ShowcaseExamples::TIME_FUTURE, $now);
        $open = $factory->policyFor(ShowcaseExamples::TIME_OPEN, $now);
        $expired = $factory->policyFor(ShowcaseExamples::TIME_EXPIRED, $now);

        $this->assertSame([
            'predicate' => 'ctx.time.capsule-access-window',
            'not_before' => '2026-08-03T12:34:56Z',
        ], $future['requirements'][4]);
        $this->assertSame([
            'predicate' => 'ctx.time.capsule-access-window',
            'not_before' => '2026-07-31T12:34:56Z',
            'not_after' => '2026-08-03T12:34:56Z',
        ], $open['requirements'][4]);
        $this->assertSame([
            'predicate' => 'ctx.time.capsule-access-window',
            'not_after' => '2026-07-30T12:34:56Z',
        ], $expired['requirements'][4]);
    }

    public function test_limit_example_uses_generous_capsule_limit(): void
    {
        $factory = new ShowcasePolicyFactory;

        $policy = $factory->policyFor(
            ShowcaseExamples::LIMIT,
            CarbonImmutable::parse('2026-08-01T12:34:56Z'),
        );

        $this->assertSame([
            'predicate' => 'ctx.usage.capsule-lifetime-limit',
            'scope' => 'capsule',
            'maximum' => 1000,
        ], $policy['requirements'][4]);
    }

    public function test_trust_example_requires_automation_risk_policy(): void
    {
        $factory = new ShowcasePolicyFactory;

        $draft = $factory->draftPolicyFor(
            ShowcaseExamples::TRUST,
            CarbonImmutable::parse('2026-08-01T12:34:56Z'),
        );
        $policy = $factory->policyFor(
            ShowcaseExamples::TRUST,
            CarbonImmutable::parse('2026-08-01T12:34:56Z'),
        );

        $this->assertTrue($draft['automation_risk_required']);
        $this->assertSame([
            'predicate' => 'ctx.risk.ecosystem-automation-not-high',
            'issuer' => (string) config('sharecapsules.ctx.issuer'),
        ], $policy['requirements'][4]);
    }

    public function test_unknown_policy_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);

        (new ShowcasePolicyFactory)->policyFor('missing');
    }
}
