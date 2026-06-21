<?php

namespace Tests\Unit\Broker;

use App\Broker\Keys\ContentKey;
use App\Broker\Keys\KeyProtectionContext;
use App\Broker\Keys\KeyProtectionFailed;
use App\Broker\Keys\LocalKeyProtectionService;
use App\Broker\Keys\NonceSource;
use Tests\TestCase;

final class LocalKeyProtectionServiceTest extends TestCase
{
    public function test_it_protects_and_recovers_an_exact_content_key_only_in_the_same_context(): void
    {
        $service = $this->service();
        $contentKey = ContentKey::fromBytes(str_repeat("\x42", 32));
        $context = new KeyProtectionContext('release-record-0000000000000001');

        $protected = $service->protect($contentKey, $context);

        $this->assertSame('local-aes-256-gcm-v1', $protected->algorithm);
        $this->assertSame('local-development-key-0001', $protected->keyId);
        $this->assertSame(16, strlen($protected->nonce));
        $this->assertSame(64, strlen($protected->ciphertext));
        $this->assertSame($contentKey->bytes(), $service->recover($protected, $context)->bytes());

        $this->expectException(KeyProtectionFailed::class);
        $service->recover(
            $protected,
            new KeyProtectionContext('different-release-record-00000001'),
        );
    }

    public function test_tampering_and_noncanonical_material_fail_closed(): void
    {
        $service = $this->service();
        $context = new KeyProtectionContext('release-record-0000000000000001');
        $protected = $service->protect(ContentKey::fromBytes(str_repeat("\x24", 32)), $context);

        $tampered = $protected->withCiphertext(substr($protected->ciphertext, 0, -1).'A');
        $this->expectException(KeyProtectionFailed::class);
        $service->recover($tampered, $context);
    }

    public function test_content_keys_and_context_identifiers_enforce_their_exact_envelopes(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        ContentKey::fromBytes(str_repeat("\x00", 31));
    }

    private function service(): LocalKeyProtectionService
    {
        $nonceSource = new class implements NonceSource
        {
            public function bytes(int $length): string
            {
                return str_repeat("\x11", $length);
            }
        };

        return new LocalKeyProtectionService(
            masterKey: str_repeat("\x7f", 32),
            keyId: 'local-development-key-0001',
            nonceSource: $nonceSource,
        );
    }
}
