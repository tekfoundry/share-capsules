<?php

namespace App\Broker\Registration;

interface GrantSecretSource
{
    public function secret(): string;
}
