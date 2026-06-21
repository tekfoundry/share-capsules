<?php

namespace App\Broker\Hpke;

interface HpkeIkmSource
{
    public function bytes(): string;
}
