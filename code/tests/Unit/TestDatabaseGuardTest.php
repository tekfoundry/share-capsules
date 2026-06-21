<?php

namespace Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use RuntimeException;
use Tests\Support\TestDatabaseGuard;

final class TestDatabaseGuardTest extends TestCase
{
    public function test_it_accepts_only_memory_sqlite_or_the_explicit_distinct_mysql_test_database(): void
    {
        TestDatabaseGuard::assertSafe('testing', 'sqlite', ':memory:', null, null);
        TestDatabaseGuard::assertSafe(
            'testing',
            'mysql',
            'sharecapsules_test',
            'sharecapsules_test',
            'sharecapsules_dev',
        );

        $this->addToAssertionCount(2);
    }

    /** @param array{string, string, string, ?string, ?string} $arguments */
    #[DataProvider('unsafeConfigurations')]
    public function test_it_refuses_every_unsafe_configuration(array $arguments): void
    {
        $this->expectException(RuntimeException::class);
        TestDatabaseGuard::assertSafe(...$arguments);
    }

    /** @return iterable<string, array{array{string, string, string, ?string, ?string}}> */
    public static function unsafeConfigurations(): iterable
    {
        yield 'not testing' => [['local', 'mysql', 'sharecapsules_test', 'sharecapsules_test', 'sharecapsules_dev']];
        yield 'missing expected' => [['testing', 'mysql', 'sharecapsules_test', null, 'sharecapsules_dev']];
        yield 'missing development' => [['testing', 'mysql', 'sharecapsules_test', 'sharecapsules_test', null]];
        yield 'unexpected database' => [['testing', 'mysql', 'other', 'sharecapsules_test', 'sharecapsules_dev']];
        yield 'development database' => [['testing', 'mysql', 'sharecapsules_dev', 'sharecapsules_dev', 'sharecapsules_dev']];
        yield 'persistent sqlite' => [['testing', 'sqlite', '/tmp/tests.sqlite', null, null]];
    }
}
