<?php

namespace App\Broker\Registration;

interface OpaqueIdentifierSource
{
    public function identifier(): string;
}
