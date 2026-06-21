<?php

namespace Tests\Support;

use RuntimeException;

final class TestDatabaseGuard
{
    public static function assertSafe(
        string $environment,
        string $driver,
        string $database,
        ?string $expectedTestDatabase,
        ?string $developmentDatabase,
    ): void {
        if ($environment !== 'testing') {
            throw new RuntimeException('Tests may run only with APP_ENV=testing.');
        }

        if ($driver === 'sqlite' && $database === ':memory:') {
            return;
        }

        if ($driver !== 'mysql'
            || $expectedTestDatabase === null || $expectedTestDatabase === ''
            || $developmentDatabase === null || $developmentDatabase === ''
            || ! hash_equals($expectedTestDatabase, $database)
            || hash_equals($developmentDatabase, $database)) {
            throw new RuntimeException(
                'Refusing to run tests without an isolated, explicitly guarded test database.',
            );
        }
    }
}
