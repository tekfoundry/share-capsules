<?php

namespace App\Ctx\Policy;

use Carbon\CarbonImmutable;
use Throwable;

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
            'ctx.time.capsule-access-window',
            'ctx.usage.capsule-lifetime-limit',
            'ctx.usage.capsule-account-lifetime-limit',
            'ctx.risk.ecosystem-automation-not-high',
        ];
        $seen = [];
        $lastPosition = -1;
        $capsuleLimit = null;
        $accountCapsuleLimit = null;
        $riskIssuer = null;
        $notBefore = null;
        $notAfter = null;

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
            } elseif ($predicate === 'ctx.time.capsule-access-window') {
                self::exactKeys($requirement, array_values(array_filter([
                    isset($requirement['not_after']) ? 'not_after' : null,
                    isset($requirement['not_before']) ? 'not_before' : null,
                    'predicate',
                ])));
                if (! isset($requirement['not_before']) && ! isset($requirement['not_after'])) {
                    throw new UnsupportedCtxPolicy('The Capsule access window is empty.');
                }
                $notBefore = isset($requirement['not_before'])
                    ? self::instant($requirement['not_before'])
                    : null;
                $notAfter = isset($requirement['not_after'])
                    ? self::instant($requirement['not_after'])
                    : null;
                if ($notBefore !== null && $notAfter !== null && ! $notBefore->lessThan($notAfter)) {
                    throw new UnsupportedCtxPolicy('The Capsule access window is invalid.');
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

        return new self($notBefore, $notAfter, $capsuleLimit, $accountCapsuleLimit, $riskIssuer);
    }

    private function __construct(
        public ?CarbonImmutable $notBefore,
        public ?CarbonImmutable $notAfter,
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

    private static function instant(mixed $value): CarbonImmutable
    {
        if (! is_string($value)
            || preg_match('/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\z/', $value) !== 1) {
            throw new UnsupportedCtxPolicy('A Capsule access-window instant is invalid.');
        }

        try {
            $instant = CarbonImmutable::createFromFormat('!Y-m-d\TH:i:s\Z', $value, 'UTC');
        } catch (Throwable) {
            throw new UnsupportedCtxPolicy('A Capsule access-window instant is invalid.');
        }
        if ($instant === false || $instant->format('Y-m-d\TH:i:s\Z') !== $value) {
            throw new UnsupportedCtxPolicy('A Capsule access-window instant is invalid.');
        }

        return $instant;
    }

    private static function issuer(mixed $value): string
    {
        if (! is_string($value) || strlen($value) > 2048 || filter_var($value, FILTER_VALIDATE_URL) === false) {
            throw new UnsupportedCtxPolicy('The automation-risk issuer is invalid.');
        }
        $parts = parse_url($value);
        if (! is_array($parts) || ! isset($parts['host'])
            || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])) {
            throw new UnsupportedCtxPolicy('The automation-risk issuer is invalid.');
        }
        $scheme = $parts['scheme'] ?? null;
        $host = $parts['host'];
        if (! is_string($host) || ! self::allowsIssuerScheme($scheme, $host)) {
            throw new UnsupportedCtxPolicy('The automation-risk issuer is invalid.');
        }

        return $value;
    }

    private static function allowsIssuerScheme(mixed $scheme, string $host): bool
    {
        if ($scheme === 'https') {
            return true;
        }

        return $scheme === 'http'
            && in_array($host, ['localhost', '127.0.0.1', '[::1]', '::1'], true);
    }
}
