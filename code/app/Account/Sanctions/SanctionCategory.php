<?php

namespace App\Account\Sanctions;

enum SanctionCategory: string
{
    case AutomationAbuse = 'automation_abuse';
    case AccountAbuse = 'account_abuse';
    case SecurityAbuse = 'security_abuse';
}
