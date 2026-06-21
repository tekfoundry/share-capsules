<?php

namespace App\Broker\Keys;

interface NonceSource
{
    public function bytes(int $length): string;
}
