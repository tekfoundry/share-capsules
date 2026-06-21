<?php

namespace App\Ctx\Risk;

final class V1AutomationRiskRules
{
    public const RULESET = 'ctx-automation-risk-v1.0';

    public const ASSESSMENT_LIFETIME_SECONDS = 60;

    public const AUTHORIZATION_WINDOW_SECONDS = 300;

    public const AUTHORIZATION_ATTEMPT_LIMIT = 300;

    public const RELEASE_WINDOW_SECONDS = 300;

    public const COMMITTED_RELEASE_LIMIT = 120;

    public const DISTINCT_CAPSULE_LIMIT = 50;

    public const REJECTION_WINDOW_SECONDS = 300;

    public const TICKET_REJECTION_LIMIT = 50;

    public const PENDING_TICKET_LIMIT = 50;

    private function __construct() {}
}
