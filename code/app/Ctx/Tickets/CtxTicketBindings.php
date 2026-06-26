<?php

namespace App\Ctx\Tickets;

use App\Ctx\Contracts\CtxV1;
use App\Ctx\Contracts\ServiceIdentity;
use Carbon\CarbonImmutable;
use InvalidArgumentException;

final readonly class CtxTicketBindings
{
    public function __construct(
        public string $broker,
        public string $capsuleId,
        public int $capsuleRevision,
        public string $policySha256,
        public string $payloadId,
        public string $releaseHandle,
        public string $proofJkt,
        public string $agreementJkt,
        public ?CarbonImmutable $notBefore = null,
        public ?CarbonImmutable $notAfter = null,
        public ?int $capsuleLifetimeLimit = null,
        public ?int $accountCapsuleLifetimeLimit = null,
        public ?string $automationRiskIssuer = null,
        public string $hostOrigin = 'https://host.example.test',
        public string $action = 'render',
    ) {
        ServiceIdentity::fromString($broker);
        if (preg_match('/\Aurn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\z/', $capsuleId) !== 1
            || $capsuleRevision < 1
            || preg_match('/\A[a-z][a-z0-9]*(?:-[a-z0-9]+)*\z/', $payloadId) !== 1
            || strlen($payloadId) > 64
            || preg_match('/\A[A-Za-z0-9_-]{16,128}\z/', $releaseHandle) !== 1) {
            throw new InvalidArgumentException('CTX ticket bindings are invalid.');
        }
        if (! self::origin($hostOrigin) || $action !== 'render') {
            throw new InvalidArgumentException('The CTX ticket challenge binding is invalid.');
        }
        foreach ([$policySha256, $proofJkt, $agreementJkt] as $digest) {
            if (! self::canonicalDigest($digest)) {
                throw new InvalidArgumentException('A CTX ticket digest is invalid.');
            }
        }
        foreach ([$capsuleLifetimeLimit, $accountCapsuleLifetimeLimit] as $limit) {
            if ($limit !== null && ($limit < 1 || $limit > 9_007_199_254_740_991)) {
                throw new InvalidArgumentException('A CTX ticket limit is invalid.');
            }
        }
        if ($automationRiskIssuer !== null) {
            ServiceIdentity::fromString($automationRiskIssuer);
        }
        if ($notBefore !== null && $notAfter !== null && ! $notBefore->lessThan($notAfter)) {
            throw new InvalidArgumentException('The CTX ticket access window is invalid.');
        }
    }

    /** @return array<string, int|string> */
    public function publicClaims(): array
    {
        return [
            'version' => 1,
            'capsule_id' => $this->capsuleId,
            'capsule_revision' => $this->capsuleRevision,
            'policy_sha256' => $this->policySha256,
            'payload_id' => $this->payloadId,
            'release_handle' => $this->releaseHandle,
            'action' => $this->action,
            'cryptographic_suite' => CtxV1::CRYPTOGRAPHIC_SUITE,
            'proof_jkt' => $this->proofJkt,
            'agreement_jkt' => $this->agreementJkt,
        ];
    }

    private static function origin(string $value): bool
    {
        $parts = parse_url($value);
        if (! is_array($parts)) {
            return false;
        }

        $scheme = $parts['scheme'] ?? null;
        $host = $parts['host'] ?? null;
        if (! is_string($scheme) || ! is_string($host)
            || isset($parts['user'])
            || isset($parts['pass'])
            || isset($parts['path'])
            || isset($parts['query'])
            || isset($parts['fragment'])) {
            return false;
        }

        return $scheme === 'https'
            || (app()->environment(['local', 'testing'])
                && $scheme === 'http'
                && in_array($host, ['localhost', '127.0.0.1', '::1', '[::1]'], true));
    }

    private static function canonicalDigest(string $value): bool
    {
        try {
            $decoded = sodium_base642bin($value, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
        } catch (\Throwable) {
            return false;
        }

        return strlen($decoded) === 32
            && sodium_bin2base64($decoded, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING) === $value;
    }
}
