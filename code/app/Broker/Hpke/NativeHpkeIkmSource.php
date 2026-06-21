<?php

namespace App\Broker\Hpke;

final class NativeHpkeIkmSource implements HpkeIkmSource
{
    public function bytes(): string
    {
        return random_bytes(32);
    }
}
