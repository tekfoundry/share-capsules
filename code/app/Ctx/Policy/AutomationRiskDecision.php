<?php

namespace App\Ctx\Policy;

enum AutomationRiskDecision: string
{
    case NotHigh = 'not-high';
    case High = 'high';
    case Unavailable = 'unavailable';
}
