<?php

namespace App\Broker\Keys;

use SensitiveParameter;
use Throwable;

final class LocalKeyProtectionService implements KeyProtectionService
{
    public const ALGORITHM = 'local-aes-256-gcm-v1';

    private const NONCE_BYTES = 12;

    private const TAG_BYTES = 16;

    public function __construct(
        #[SensitiveParameter] private readonly string $masterKey,
        private readonly string $keyId,
        private readonly NonceSource $nonceSource,
    ) {
        if (strlen($masterKey) !== 32) {
            throw new KeyProtectionFailed('The local key-protection key is invalid.');
        }

        if (preg_match('/\A[A-Za-z0-9_-]{16,128}\z/', $keyId) !== 1) {
            throw new KeyProtectionFailed('The local key-protection identifier is invalid.');
        }
    }

    public function protect(ContentKey $contentKey, KeyProtectionContext $context): ProtectedKeyMaterial
    {
        $nonce = $this->nonceSource->bytes(self::NONCE_BYTES);
        if (strlen($nonce) !== self::NONCE_BYTES) {
            throw new KeyProtectionFailed('The local nonce source returned an invalid nonce.');
        }

        $tag = '';
        $ciphertext = openssl_encrypt(
            $contentKey->bytes(),
            'aes-256-gcm',
            $this->masterKey,
            OPENSSL_RAW_DATA,
            $nonce,
            $tag,
            $context->additionalAuthenticatedData(),
            self::TAG_BYTES,
        );
        if (! is_string($ciphertext) || strlen($tag) !== self::TAG_BYTES) {
            throw new KeyProtectionFailed('Content-key protection failed.');
        }

        return new ProtectedKeyMaterial(
            algorithm: self::ALGORITHM,
            keyId: $this->keyId,
            nonce: $this->encode($nonce),
            ciphertext: $this->encode($ciphertext.$tag),
        );
    }

    public function recover(ProtectedKeyMaterial $protected, KeyProtectionContext $context): ContentKey
    {
        try {
            if ($protected->algorithm !== self::ALGORITHM
                || $protected->keyId !== $this->keyId) {
                throw new KeyProtectionFailed('Protected content-key metadata is not accepted.');
            }

            $nonce = $this->decode($protected->nonce, self::NONCE_BYTES);
            $combined = $this->decode($protected->ciphertext, 32 + self::TAG_BYTES);
            $ciphertext = substr($combined, 0, -self::TAG_BYTES);
            $tag = substr($combined, -self::TAG_BYTES);
            $plaintext = openssl_decrypt(
                $ciphertext,
                'aes-256-gcm',
                $this->masterKey,
                OPENSSL_RAW_DATA,
                $nonce,
                $tag,
                $context->additionalAuthenticatedData(),
            );
            if (! is_string($plaintext)) {
                throw new KeyProtectionFailed('Protected content-key authentication failed.');
            }

            return ContentKey::fromBytes($plaintext);
        } catch (KeyProtectionFailed $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            throw new KeyProtectionFailed('Protected content-key recovery failed.', 0, $exception);
        }
    }

    private function encode(string $value): string
    {
        return sodium_bin2base64($value, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }

    private function decode(string $value, int $expectedBytes): string
    {
        try {
            $decoded = sodium_base642bin($value, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
        } catch (Throwable $exception) {
            throw new KeyProtectionFailed('Protected content-key encoding is invalid.', 0, $exception);
        }

        if (strlen($decoded) !== $expectedBytes || $this->encode($decoded) !== $value) {
            throw new KeyProtectionFailed('Protected content-key encoding is not canonical.');
        }

        return $decoded;
    }
}
