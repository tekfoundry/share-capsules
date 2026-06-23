<?php

namespace App\Broker\Lifecycle;

enum BrokerContentKeyOperation: string
{
    case PauseCreator = 'pause_creator';
    case ResumeCreator = 'resume_creator';
    case RevokeCapsule = 'revoke_capsule';
    case DestroyCapsule = 'destroy_capsule';
    case DestroyCreator = 'destroy_creator';
    case FinalizeRegistration = 'finalize_registration';
    case CancelRegistration = 'cancel_registration';
}
