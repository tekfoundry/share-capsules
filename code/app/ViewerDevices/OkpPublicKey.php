<?php

namespace App\ViewerDevices;

use Illuminate\Validation\ValidationException;
use SodiumException;

final readonly class OkpPublicKey
{
    private function __construct(
        public string $curve,
        public string $encoded,
        public string $raw,
        public string $thumbprint,
    ) {}

    /** @param array<string, mixed> $jwk */
    public static function fromJwk(array $jwk, string $expectedCurve, string $field): self
    {
        $keys = array_keys($jwk);
        sort($keys);

        if ($keys !== ['crv', 'kty', 'x']
            || ($jwk['kty'] ?? null) !== 'OKP'
            || ($jwk['crv'] ?? null) !== $expectedCurve
            || ! is_string($jwk['x'] ?? null)) {
            throw ValidationException::withMessages([
                $field => "The {$field} must be an exact public {$expectedCurve} JWK.",
            ]);
        }

        $encoded = $jwk['x'];

        try {
            $raw = sodium_base642bin($encoded, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
        } catch (SodiumException) {
            throw ValidationException::withMessages([
                $field => "The {$field} contains an invalid public key.",
            ]);
        }

        if (strlen($raw) !== 32
            || sodium_bin2base64($raw, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING) !== $encoded) {
            throw ValidationException::withMessages([
                $field => "The {$field} must contain a canonical 32-byte public key.",
            ]);
        }

        $canonical = json_encode([
            'crv' => $expectedCurve,
            'kty' => 'OKP',
            'x' => $encoded,
        ], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $thumbprint = sodium_bin2base64(
            hash('sha256', $canonical, true),
            SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
        );

        return new self($expectedCurve, $encoded, $raw, $thumbprint);
    }
}
