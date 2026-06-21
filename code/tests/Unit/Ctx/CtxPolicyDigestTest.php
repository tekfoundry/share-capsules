<?php

namespace Tests\Unit\Ctx;

use App\Ctx\Policy\CtxPolicyDigest;
use PHPUnit\Framework\TestCase;

final class CtxPolicyDigestTest extends TestCase
{
    public function test_php_matches_the_shared_rfc_8785_policy_vector(): void
    {
        $path = dirname(__DIR__, 3).'/packages/test-fixtures/src/vectors/cryptographic-vectors-v1.json';
        $vectors = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
        $policy = json_decode($vectors['policy']['canonical_utf8'], true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame(
            $vectors['policy']['sha256_base64url'],
            (new CtxPolicyDigest)->calculate($policy),
        );
    }
}
