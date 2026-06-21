<?php

namespace App\Ctx\Tickets;

use App\Ctx\Contracts\CtxV1;
use App\Ctx\Contracts\ServiceIdentity;
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
        public ?int $capsuleLifetimeLimit = null,
        public ?int $accountCapsuleLifetimeLimit = null,
        public ?string $automationRiskIssuer = null,
    ) {
        ServiceIdentity::fromString($broker);
        if (preg_match('/\Aurn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\z/', $capsuleId) !== 1
            || $capsuleRevision < 1
            || preg_match('/\A[a-z][a-z0-9]*(?:-[a-z0-9]+)*\z/', $payloadId) !== 1
            || strlen($payloadId) > 64
            || preg_match('/\A[A-Za-z0-9_-]{16,128}\z/', $releaseHandle) !== 1) {
            throw new InvalidArgumentException('CTX ticket bindings are invalid.');
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
            'action' => 'render',
            'cryptographic_suite' => CtxV1::CRYPTOGRAPHIC_SUITE,
            'proof_jkt' => $this->proofJkt,
            'agreement_jkt' => $this->agreementJkt,
        ];
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
