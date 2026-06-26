<?php

namespace App\Ctx\Trust;

enum UsageConfidence: string
{
    case Zero = 'zero';
    case Low = 'low';
    case Medium = 'medium';
    case High = 'high';

    public function requiresChallenge(): bool
    {
        return in_array($this, [self::Zero, self::Low], true);
    }
}
