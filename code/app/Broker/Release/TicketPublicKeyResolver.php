<?php

namespace App\Broker\Release;

interface TicketPublicKeyResolver
{
    public function resolve(string $issuer, string $kid): string;
}
