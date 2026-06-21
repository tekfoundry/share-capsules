<?php

namespace App\ViewerDevices;

enum ViewerDeviceStatus: string
{
    case Active = 'active';
    case Suspended = 'suspended';
    case Revoked = 'revoked';
}
