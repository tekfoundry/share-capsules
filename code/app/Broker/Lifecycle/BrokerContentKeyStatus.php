<?php

namespace App\Broker\Lifecycle;

enum BrokerContentKeyStatus: string
{
    case Pending = 'pending';
    case Active = 'active';
    case Paused = 'paused';
    case Revoked = 'revoked';
    case Destroyed = 'destroyed';
}
