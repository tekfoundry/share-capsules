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

    public function test_it_redacts_phase_10_sensitive_protocol_fields(): void
    {
        $record = new LogRecord(
            datetime: new DateTimeImmutable,
            channel: 'test',
            level: Level::Info,
            message: implode(' ', [
                'Authorization: DPoP raw-oauth-token',
                'ticket=raw-authorization-ticket',
                'proof=raw-dpop-proof',
                'release_handle=raw-release-handle',
                'content_key=raw-content-key',
                'plaintext=raw-plaintext',
            ]),
            context: [
                'authorization_ticket' => 'raw-authorization-ticket',
                'dpop_proof' => 'raw-dpop-proof',
                'release_handle' => 'raw-release-handle',
                'content_key' => 'raw-content-key',
                'plaintext' => 'raw-plaintext',
                'raw_trust_history' => ['score' => 99],
                'challenge_telemetry' => ['cursor_path' => [1, 2, 3]],
                'safe_denial_category' => 'risk',
            ],
            extra: [
                'interaction_summary' => ['keystrokes' => 5],
            ],
        );

        $redacted = (new RedactSensitiveContext)($record);
        $serialized = json_encode([
            'message' => $redacted->message,
            'context' => $redacted->context,
            'extra' => $redacted->extra,
        ], JSON_THROW_ON_ERROR);

        foreach ([
            'raw-oauth-token',
            'raw-authorization-ticket',
            'raw-dpop-proof',
            'raw-release-handle',
            'raw-content-key',
            'raw-plaintext',
            'cursor_path',
            'keystrokes',
        ] as $secret) {
            $this->assertStringNotContainsString($secret, $serialized);
        }
        $this->assertSame('risk', $redacted->context['safe_denial_category']);
        $this->assertSame('[REDACTED]', $redacted->context['release_handle']);
        $this->assertSame('[REDACTED]', $redacted->extra['interaction_summary']);
    }
}
