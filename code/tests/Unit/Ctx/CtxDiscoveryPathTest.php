<?php

namespace Tests\Unit\Ctx;

use App\Ctx\Discovery\CtxDiscoveryPath;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class CtxDiscoveryPathTest extends TestCase
{
    /** @return iterable<string, array{string, string}> */
    public static function issuerPaths(): iterable
    {
        yield 'origin issuer' => [
            'https://trust.example',
            '/.well-known/ctx-configuration',
        ];
        yield 'tenant issuer' => [
            'https://trust.example/tenant',
            '/.well-known/ctx-configuration/tenant',
        ];
    }

    #[DataProvider('issuerPaths')]
    public function test_it_applies_the_rfc_8414_well_known_insertion_rule(
        string $issuer,
        string $expected,
    ): void {
        $this->assertSame($expected, CtxDiscoveryPath::forIssuer($issuer));
    }

    public function test_it_rejects_a_non_url_issuer(): void
    {
        $this->expectException(InvalidArgumentException::class);

        CtxDiscoveryPath::forIssuer('not-a-url');
    }
}
