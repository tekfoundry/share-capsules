<?php

namespace App\Account\Sanctions;

use InvalidArgumentException;

final readonly class SanctionEmailHasher
{
    private string $key;

    public function __construct()
    {
        $configured = (string) config('accounts.sanctions.email_hmac_key');
        $key = str_starts_with($configured, 'base64:')
            ? base64_decode(substr($configured, 7), true)
            : $configured;

        if (! is_string($key) || strlen($key) !== 32) {
            throw new InvalidArgumentException(
                'The account sanction HMAC key must contain exactly 32 bytes.',
            );
        }

        $this->key = $key;
    }

    public function hash(string $email): string
    {
        return hash_hmac('sha256', self::normalize($email), $this->key, true);
    }

    public static function normalize(string $email): string
    {
        return mb_strtolower(trim($email));
    }
}
