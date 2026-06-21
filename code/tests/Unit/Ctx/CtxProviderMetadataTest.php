<?php

namespace Tests\Unit\Ctx;

use App\Ctx\Discovery\CtxProviderMetadata;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class CtxProviderMetadataTest extends TestCase
{
    /** @return iterable<string, array{string}> */
    public static function unsafeIssuers(): iterable
    {
        yield 'plain HTTP' => ['http://trust.example'];
        yield 'user information' => ['https://user@trust.example'];
        yield 'query' => ['https://trust.example?tenant=one'];
        yield 'fragment' => ['https://trust.example#keys'];
        yield 'not a URL' => ['not-a-url'];
    }

    #[DataProvider('unsafeIssuers')]
    public function test_it_rejects_unsafe_or_non_https_provider_identities(string $issuer): void
    {
        config()->set('sharecapsules.ctx.issuer', $issuer);

        $this->expectException(InvalidArgumentException::class);

        app(CtxProviderMetadata::class)->toArray();
    }

    public function test_local_http_is_an_explicit_non_production_exception(): void
    {
        config()->set('sharecapsules.ctx.issuer', 'http://localhost:3003');

        $this->assertSame(
            'http://localhost:3003',
            app(CtxProviderMetadata::class)->toArray()['issuer'],
        );
    }
}
