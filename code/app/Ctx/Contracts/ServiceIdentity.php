<?php

namespace App\Ctx\Contracts;

use InvalidArgumentException;

final readonly class ServiceIdentity
{
    private function __construct(public string $value) {}

    public static function fromString(string $value): self
    {
        $value = rtrim($value, '/');
        $parts = parse_url($value);
        $isLocalDevelopment = config('sharecapsules.deployment.environment') !== 'production'
            && ($parts['host'] ?? null) === 'localhost'
            && ($parts['scheme'] ?? null) === 'http';

        if (! is_array($parts)
            || (($parts['scheme'] ?? null) !== 'https' && ! $isLocalDevelopment)
            || ! isset($parts['host'])
            || isset($parts['user'])
            || isset($parts['pass'])
            || isset($parts['query'])
            || isset($parts['fragment'])
            || strlen($value) > 2048) {
            throw new InvalidArgumentException('The service identity is not a safe absolute URL.');
        }

        return new self($value);
    }

    public function endpoint(string $path): string
    {
        return $this->value.'/'.ltrim($path, '/');
    }
}
