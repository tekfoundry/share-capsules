<?php

namespace App\Showcase;

final readonly class ShowcaseCapsulePrepareResult
{
    /**
     * @param  array<string, mixed>  $policy
     * @param  array{width: int, height: int, media_type: string, encoded_bytes: int}  $metadata
     */
    public function __construct(
        public string $registrationId,
        public string $capsuleId,
        public int $capsuleRevision,
        public string $payloadId,
        public string $policySha256,
        public array $policy,
        public string $title,
        public string $contentProfileId,
        public string $contentProfileVersion,
        public string $mediaType,
        public string $contentKeySha256,
        public array $metadata,
    ) {}

    /** @param array<string, mixed> $payload */
    public static function fromPayload(array $payload): self
    {
        /** @var array<string, mixed> $registration */
        $registration = $payload['registration'] ?? [];
        /** @var array<string, mixed> $metadata */
        $metadata = $payload['metadata'] ?? [];

        return new self(
            registrationId: self::string($registration, 'registration_id'),
            capsuleId: self::string($registration, 'capsule_id'),
            capsuleRevision: self::integer($registration, 'capsule_revision'),
            payloadId: self::string($registration, 'payload_id'),
            policySha256: self::string($registration, 'policy_sha256'),
            policy: self::array($registration, 'policy'),
            title: self::string($registration, 'title'),
            contentProfileId: self::string($registration, 'content_profile_id'),
            contentProfileVersion: self::string($registration, 'content_profile_version'),
            mediaType: self::string($registration, 'media_type'),
            contentKeySha256: self::string($payload, 'content_key_sha256'),
            metadata: [
                'width' => self::integer($metadata, 'width'),
                'height' => self::integer($metadata, 'height'),
                'media_type' => self::string($metadata, 'media_type'),
                'encoded_bytes' => self::integer($metadata, 'encoded_bytes'),
            ],
        );
    }

    /** @param array<string, mixed> $payload */
    private static function string(array $payload, string $key): string
    {
        $value = $payload[$key] ?? null;
        if (! is_string($value) || $value === '') {
            throw new ShowcaseGenerationFailed("Bridge response field [{$key}] is invalid.");
        }

        return $value;
    }

    /** @param array<string, mixed> $payload */
    private static function integer(array $payload, string $key): int
    {
        $value = $payload[$key] ?? null;
        if (! is_int($value)) {
            throw new ShowcaseGenerationFailed("Bridge response field [{$key}] is invalid.");
        }

        return $value;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private static function array(array $payload, string $key): array
    {
        $value = $payload[$key] ?? null;
        if (! is_array($value)) {
            throw new ShowcaseGenerationFailed("Bridge response field [{$key}] is invalid.");
        }

        return $value;
    }
}
