<?php

namespace App\Ctx\Policy;

final readonly class CtxPolicyV1
{
    public const MAXIMUM_LIMIT = 9_007_199_254_740_991;

    /** @param array<string, mixed> $value */
    public static function parse(array $value): self
    {
        self::exactKeys($value, ['combiner', 'requirements', 'type', 'version']);
        if (($value['type'] ?? null) !== 'ctx-policy'
            || ($value['version'] ?? null) !== 1
            || ($value['combiner'] ?? null) !== 'all'
            || ! is_array($value['requirements'] ?? null)
            || ! array_is_list($value['requirements'])) {
            throw new UnsupportedCtxPolicy('The CTX policy profile is unsupported.');
        }

        $required = [
            'ctx.account.email-verified',
            'ctx.account.active',
            'ctx.viewer.device-registered',
            'ctx.consent.capsule-view-event',
        ];
        $order = [
            ...$required,
            'ctx.usage.capsule-lifetime-limit',
            'ctx.usage.capsule-account-lifetime-limit',
            'ctx.risk.ecosystem-automation-not-high',
        ];
        $seen = [];
        $lastPosition = -1;
        $capsuleLimit = null;
        $accountCapsuleLimit = null;
        $riskIssuer = null;

        foreach ($value['requirements'] as $requirement) {
            if (! is_array($requirement) || array_is_list($requirement)) {
                throw new UnsupportedCtxPolicy('A CTX policy requirement is malformed.');
            }
            $predicate = $requirement['predicate'] ?? null;
            $position = is_string($predicate) ? array_search($predicate, $order, true) : false;
            if (! is_int($position) || isset($seen[$predicate]) || $position <= $lastPosition) {
                throw new UnsupportedCtxPolicy('A CTX policy predicate is unsupported or out of order.');
            }
            $seen[$predicate] = true;
            $lastPosition = $position;

            if (in_array($predicate, $required, true)) {
                self::exactKeys($requirement, ['equals', 'predicate']);
                if (($requirement['equals'] ?? null) !== true) {
                    throw new UnsupportedCtxPolicy('A mandatory CTX predicate is malformed.');
                }
            } elseif ($predicate === 'ctx.usage.capsule-lifetime-limit') {
                self::exactKeys($requirement, ['maximum', 'predicate', 'scope']);
                if (($requirement['scope'] ?? null) !== 'capsule') {
                    throw new UnsupportedCtxPolicy('The Capsule limit scope is invalid.');
                }
                $capsuleLimit = self::limit($requirement['maximum'] ?? null);
            } elseif ($predicate === 'ctx.usage.capsule-account-lifetime-limit') {
                self::exactKeys($requirement, ['maximum', 'predicate', 'scope']);
                if (($requirement['scope'] ?? null) !== 'account-and-capsule') {
                    throw new UnsupportedCtxPolicy('The account Capsule limit scope is invalid.');
                }
                $accountCapsuleLimit = self::limit($requirement['maximum'] ?? null);
            } else {
                self::exactKeys($requirement, ['issuer', 'predicate']);
                $riskIssuer = self::issuer($requirement['issuer'] ?? null);
            }
        }

        foreach ($required as $predicate) {
            if (! isset($seen[$predicate])) {
                throw new UnsupportedCtxPolicy('A mandatory CTX predicate is missing.');
            }
        }

        return new self($capsuleLimit, $accountCapsuleLimit, $riskIssuer);
    }

    private function __construct(
        public ?int $capsuleLifetimeLimit,
        public ?int $accountCapsuleLifetimeLimit,
        public ?string $automationRiskIssuer,
    ) {}

    /** @param array<string, mixed> $value @param list<string> $expected */
    private static function exactKeys(array $value, array $expected): void
    {
        $keys = array_keys($value);
        sort($keys);
        if ($keys !== $expected) {
            throw new UnsupportedCtxPolicy('Unknown CTX policy fields are not accepted.');
        }
    }

    private static function limit(mixed $value): int
    {
        if (! is_int($value) || $value < 1 || $value > self::MAXIMUM_LIMIT) {
            throw new UnsupportedCtxPolicy('A CTX policy limit is invalid.');
        }

        return $value;
    }

    private static function issuer(mixed $value): string
    {
        if (! is_string($value) || strlen($value) > 2048 || filter_var($value, FILTER_VALIDATE_URL) === false) {
            throw new UnsupportedCtxPolicy('The automation-risk issuer is invalid.');
        }
        $parts = parse_url($value);
        if (! is_array($parts) || ($parts['scheme'] ?? null) !== 'https' || ! isset($parts['host'])
            || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])) {
            throw new UnsupportedCtxPolicy('The automation-risk issuer is invalid.');
        }

        return $value;
    }
}
