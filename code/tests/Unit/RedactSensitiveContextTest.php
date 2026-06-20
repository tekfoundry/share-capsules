<?php

namespace Tests\Unit;

use App\Logging\RedactSensitiveContext;
use DateTimeImmutable;
use Monolog\Level;
use Monolog\LogRecord;
use PHPUnit\Framework\TestCase;

final class RedactSensitiveContextTest extends TestCase
{
    public function test_it_redacts_sensitive_keys_and_bearer_values_recursively(): void
    {
        $record = new LogRecord(
            datetime: new DateTimeImmutable,
            channel: 'test',
            level: Level::Info,
            message: 'Request used Bearer top-secret-token',
            context: [
                'account_id' => 'account-123',
                'password' => 'do-not-log',
                'nested' => [
                    'recovery_code' => 'also-do-not-log',
                ],
            ],
        );

        $redacted = (new RedactSensitiveContext)($record);

        $this->assertSame('Request used Bearer [REDACTED]', $redacted->message);
        $this->assertSame('account-123', $redacted->context['account_id']);
        $this->assertSame('[REDACTED]', $redacted->context['password']);
        $this->assertSame('[REDACTED]', $redacted->context['nested']['recovery_code']);
    }
}
