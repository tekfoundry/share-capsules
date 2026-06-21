<?php

namespace App\Ctx\Contracts;

final class CtxV1
{
    public const PROTOCOL_VERSION = 'ctx-1';

    public const TICKET_TYPE = 'ctx-key-release+jwt';

    public const SIGNING_ALGORITHM = 'EdDSA';

    public const CRYPTOGRAPHIC_SUITE = 'ctx-capsule-v1';

    public const TICKET_LIFETIME_SECONDS = 60;

    public const CLOCK_SKEW_SECONDS = 5;

    public const MAX_PUBLISHED_SIGNING_KEYS = 16;
}
