<?php

namespace App\Broker\Lifecycle;

enum BrokerContentKeyStatus: string
{
    case Active = 'active';
    case Paused = 'paused';
    case Revoked = 'revoked';
    case Destroyed = 'destroyed';
}
