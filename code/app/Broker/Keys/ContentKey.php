<?php

namespace App\Broker\Keys;

use InvalidArgumentException;
use SensitiveParameter;

final readonly class ContentKey
{
    private function __construct(private string $bytes) {}

    public static function fromBytes(#[SensitiveParameter] string $bytes): self
    {
        if (strlen($bytes) !== 32) {
            throw new InvalidArgumentException('A Capsule content key must contain exactly 32 bytes.');
        }

        return new self($bytes);
    }

    public function bytes(): string
    {
        return $this->bytes;
    }
}
