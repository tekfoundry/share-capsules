<?php

namespace App\Broker\Hpke;

final readonly class WrappedContentKey
{
    public function __construct(public string $enc, public string $ciphertext) {}
}
