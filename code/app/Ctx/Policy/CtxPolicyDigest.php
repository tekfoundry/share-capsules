<?php

namespace App\Ctx\Policy;

use App\Ctx\Contracts\CanonicalJson;

final class CtxPolicyDigest
{
    public function __construct(private readonly CanonicalJson $canonicalJson = new CanonicalJson) {}

    /** @param array<string, mixed> $policy */
    public function calculate(array $policy): string
    {
        return sodium_bin2base64(
            hash('sha256', $this->canonicalJson->encode($policy), true),
            SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
        );
    }
}
