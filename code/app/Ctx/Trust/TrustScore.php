<?php

namespace App\Ctx\Trust;

use InvalidArgumentException;

final readonly class TrustScore
{
    private function __construct(public int $value) {}

    public static function fromInt(int $value): self
    {
        if ($value < 0 || $value > 100) {
            throw new InvalidArgumentException('Trust scores must be between 0 and 100.');
        }

        return new self($value);
    }

    public static function zero(): self
    {
        return new self(0);
    }

    public static function perfect(): self
    {
        return new self(100);
    }

    public static function average(self ...$scores): self
    {
        if ($scores === []) {
            throw new InvalidArgumentException('At least one trust score is required.');
        }

        return new self((int) round(
            array_sum(array_map(fn (self $score): int => $score->value, $scores)) / count($scores),
        ));
    }
}
