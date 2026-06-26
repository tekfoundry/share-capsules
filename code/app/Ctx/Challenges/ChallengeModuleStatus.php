<?php

namespace App\Ctx\Challenges;

enum ChallengeModuleStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case Disabled = 'disabled';
    case Retired = 'retired';
}
