<?php

namespace App\Capsules\Registry;

use App\Ctx\Contracts\ServiceIdentity;
use App\Ctx\Policy\CtxPolicyDigest;
use App\Ctx\Policy\CtxPolicyV1;
use InvalidArgumentException;

final readonly class PendingCapsuleRegistration
{
    /** @param array<string, mixed> $policy */
    public static function fromValues(
        string $registrationId,
        string $capsuleId,
        int $capsuleRevision,
        string $payloadId,
        string $broker,
        string $policySha256,
        array $policy,
        ?string $title = null,
        ?string $contentProfileId = null,
        ?string $contentProfileVersion = null,
        ?string $mediaType = null,
        ?CtxPolicyDigest $digests = null,
    ): self {
        if (preg_match('/\A[A-Za-z0-9_-]{16,128}\z/', $registrationId) !== 1
            || preg_match('/\Aurn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\z/', $capsuleId) !== 1
            || $capsuleRevision < 1
            || preg_match('/\A[a-z][a-z0-9]*(?:-[a-z0-9]+)*\z/', $payloadId) !== 1
            || strlen($payloadId) > 64
            || preg_match('/\A[A-Za-z0-9_-]{43}\z/', $policySha256) !== 1
            || ! self::validMetadata($title, $contentProfileId, $contentProfileVersion, $mediaType)) {
            throw new InvalidArgumentException('The pending Capsule registration binding is invalid.');
        }

        $brokerIdentity = ServiceIdentity::fromString($broker);
        $parsedPolicy = CtxPolicyV1::parse($policy);
        $actualDigest = ($digests ?? new CtxPolicyDigest)->calculate($policy);
        if (! hash_equals($policySha256, $actualDigest)) {
            throw new InvalidArgumentException('The pending Capsule policy digest does not match.');
        }

        return new self(
            $registrationId,
            $capsuleId,
            $capsuleRevision,
            $payloadId,
            $brokerIdentity->value,
            $policySha256,
            $policy,
            $parsedPolicy,
            $title,
            $contentProfileId,
            $contentProfileVersion,
            $mediaType,
        );
    }

    /** @param array<string, mixed> $policy */
    private function __construct(
        public string $registrationId,
        public string $capsuleId,
        public int $capsuleRevision,
        public string $payloadId,
        public string $broker,
        public string $policySha256,
        public array $policy,
        public CtxPolicyV1 $summary,
        public ?string $title,
        public ?string $contentProfileId,
        public ?string $contentProfileVersion,
        public ?string $mediaType,
    ) {}

    private static function validMetadata(
        ?string $title,
        ?string $contentProfileId,
        ?string $contentProfileVersion,
        ?string $mediaType,
    ): bool {
        $values = [$title, $contentProfileId, $contentProfileVersion, $mediaType];
        if (count(array_filter($values, static fn (?string $value): bool => $value !== null)) === 0) {
            return true;
        }

        return count(array_filter($values, static fn (?string $value): bool => $value !== null)) === 4
            && is_string($title) && mb_strlen($title) >= 1 && mb_strlen($title) <= 200
            && is_string($contentProfileId) && strlen($contentProfileId) <= 128
            && preg_match('/\A[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*\z/', $contentProfileId) === 1
            && is_string($contentProfileVersion) && strlen($contentProfileVersion) <= 32
            && preg_match('/\A\d+\.\d+\z/', $contentProfileVersion) === 1
            && is_string($mediaType) && strlen($mediaType) <= 127
            && preg_match('/\A[a-z0-9][a-z0-9!#$&^_.+\-]*\/[a-z0-9][a-z0-9!#$&^_.+\-]*\z/', $mediaType) === 1;
    }
}
