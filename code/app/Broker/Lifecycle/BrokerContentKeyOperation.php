<?php

namespace App\Broker\Lifecycle;

enum BrokerContentKeyOperation: string
{
    case PauseCreator = 'pause_creator';
    case ResumeCreator = 'resume_creator';
    case RevokeCapsule = 'revoke_capsule';
    case DestroyCreator = 'destroy_creator';
}
