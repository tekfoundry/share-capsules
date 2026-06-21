<?php

namespace App\Ctx\Policy;

final readonly class PreliminaryPolicyDecision
{
    public function __construct(public PolicyDecisionCode $code) {}

    public function allowed(): bool
    {
        return $this->code === PolicyDecisionCode::Allowed;
    }
}
