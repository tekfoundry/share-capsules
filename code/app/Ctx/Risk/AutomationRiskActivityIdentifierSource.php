<?php

namespace App\Ctx\Risk;

interface AutomationRiskActivityIdentifierSource
{
    public function identifier(): string;
}
