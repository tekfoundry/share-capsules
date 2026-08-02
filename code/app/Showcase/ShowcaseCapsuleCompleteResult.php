<?php

namespace App\Showcase;

final readonly class ShowcaseCapsuleCompleteResult
{
    public function __construct(
        public string $archiveSha256,
        public int $archiveBytes,
        public bool $verified,
    ) {}

    /** @param array<string, mixed> $payload */
    public static function fromPayload(array $payload): self
    {
        $archive = $payload['archive'] ?? null;
        if (! is_array($archive)) {
            throw new ShowcaseGenerationFailed('Bridge response archive field is invalid.');
        }

        return new self(
            archiveSha256: self::string($archive, 'sha256'),
            archiveBytes: self::integer($archive, 'bytes'),
            verified: self::boolean($payload, 'verified'),
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

    /** @param array<string, mixed> $payload */
    private static function boolean(array $payload, string $key): bool
    {
        $value = $payload[$key] ?? null;
        if (! is_bool($value)) {
            throw new ShowcaseGenerationFailed("Bridge response field [{$key}] is invalid.");
        }

        return $value;
    }
}
