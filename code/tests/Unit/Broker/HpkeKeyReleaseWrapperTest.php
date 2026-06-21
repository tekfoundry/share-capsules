<?php

namespace Tests\Unit\Broker;

use App\Broker\Hpke\HpkeIkmSource;
use App\Broker\Hpke\HpkeKeyReleaseWrapper;
use App\Broker\Keys\ContentKey;
use PHPUnit\Framework\TestCase;

final class HpkeKeyReleaseWrapperTest extends TestCase
{
    public function test_php_reproduces_the_independent_v1_hpke_vector(): void
    {
        $path = dirname(__DIR__, 3).'/packages/test-fixtures/src/vectors/cryptographic-vectors-v1.json';
        $vectors = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
        $vector = $vectors['hpke_key_release'];
        $ikm = hex2bin($vector['ephemeral_ikm_hex']);
        $wrapper = new HpkeKeyReleaseWrapper(new class($ikm) implements HpkeIkmSource
        {
            public function __construct(private readonly string $ikm) {}

            public function bytes(): string
            {
                return $this->ikm;
            }
        });

        $wrapped = $wrapper->wrap(
            ContentKey::fromBytes(hex2bin($vector['content_key_hex'])),
            hex2bin($vector['recipient_public_key_hex']),
            hex2bin($vector['info_hex']),
            hex2bin($vector['aad_hex']),
        );

        $this->assertSame($vector['enc_hex'], bin2hex($wrapped->enc));
        $this->assertSame($vector['ciphertext_hex'], bin2hex($wrapped->ciphertext));
    }
}
