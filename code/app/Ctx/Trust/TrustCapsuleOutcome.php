<?php

namespace App\Ctx\Trust;

enum TrustCapsuleOutcome: string
{
    case Allow = 'allow';
    case ChallengeRequired = 'challenge_required';
    case Deny = 'deny';
    case TemporarilyUnavailable = 'temporarily_unavailable';
}
