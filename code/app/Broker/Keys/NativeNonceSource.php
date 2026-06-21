<?php

namespace App\Broker\Keys;

final class NativeNonceSource implements NonceSource
{
    public function bytes(int $length): string
    {
        return random_bytes($length);
    }
}
