<?php

namespace App\Broker\Registration;

final readonly class RegisteredContentKey
{
    public function __construct(public string $releaseHandle, public bool $created) {}
}
