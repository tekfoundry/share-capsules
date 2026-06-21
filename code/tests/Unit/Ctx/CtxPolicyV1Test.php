<?php

namespace Tests\Unit\Ctx;

use App\Ctx\Policy\CtxPolicyV1;
use App\Ctx\Policy\UnsupportedCtxPolicy;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class CtxPolicyV1Test extends TestCase
{
    public function test_it_accepts_the_exact_profile_and_extracts_creator_gates(): void
    {
        $policy = CtxPolicyV1::parse($this->policy([
            ['predicate' => 'ctx.usage.capsule-lifetime-limit', 'scope' => 'capsule', 'maximum' => 5],
            ['predicate' => 'ctx.usage.capsule-account-lifetime-limit', 'scope' => 'account-and-capsule', 'maximum' => 3],
            ['predicate' => 'ctx.risk.ecosystem-automation-not-high', 'issuer' => 'https://trust.example/tenant'],
        ]));

        $this->assertSame(5, $policy->capsuleLifetimeLimit);
        $this->assertSame(3, $policy->accountCapsuleLifetimeLimit);
        $this->assertSame('https://trust.example/tenant', $policy->automationRiskIssuer);
    }

    /** @param callable(array<string, mixed>): array<string, mixed> $mutate */
    #[DataProvider('invalidPolicies')]
    public function test_it_fails_closed_on_noncanonical_or_unsupported_policy(callable $mutate): void
    {
        $this->expectException(UnsupportedCtxPolicy::class);
        CtxPolicyV1::parse($mutate($this->policy()));
    }

    /** @return iterable<string, array{callable(array<string, mixed>): array<string, mixed>}> */
    public static function invalidPolicies(): iterable
    {
        yield 'unknown top-level field' => [function (array $policy): array {
            $policy['expression'] = 'true';

            return $policy;
        }];
        yield 'missing mandatory predicate' => [function (array $policy): array {
            array_pop($policy['requirements']);

            return $policy;
        }];
        yield 'out of order' => [function (array $policy): array {
            [$policy['requirements'][0], $policy['requirements'][1]] = [
                $policy['requirements'][1],
                $policy['requirements'][0],
            ];

            return $policy;
        }];
        yield 'unsafe integer' => [fn (array $policy): array => [
            ...$policy,
            'requirements' => [
                ...$policy['requirements'],
                [
                    'predicate' => 'ctx.usage.capsule-lifetime-limit',
                    'scope' => 'capsule',
                    'maximum' => CtxPolicyV1::MAXIMUM_LIMIT + 1,
                ],
            ],
        ]];
        yield 'issuer with user information' => [fn (array $policy): array => [
            ...$policy,
            'requirements' => [
                ...$policy['requirements'],
                [
                    'predicate' => 'ctx.risk.ecosystem-automation-not-high',
                    'issuer' => 'https://user@trust.example',
                ],
            ],
        ]];
    }

    /** @param list<array<string, mixed>> $optional @return array<string, mixed> */
    private function policy(array $optional = []): array
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
                ...$optional,
            ],
        ];
    }
}
