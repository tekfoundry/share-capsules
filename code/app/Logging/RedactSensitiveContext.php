<?php

namespace App\Logging;

use Monolog\LogRecord;
use Monolog\Processor\ProcessorInterface;

final class RedactSensitiveContext implements ProcessorInterface
{
    private const REDACTED = '[REDACTED]';

    public function __invoke(LogRecord $record): LogRecord
    {
        return $record->with(
            message: $this->redactString($record->message),
            context: $this->redactArray($record->context),
            extra: $this->redactArray($record->extra),
        );
    }

    /** @param array<mixed> $values */
    private function redactArray(array $values): array
    {
        $redacted = [];

        foreach ($values as $key => $value) {
            if (is_string($key) && $this->isSensitiveKey($key)) {
                $redacted[$key] = self::REDACTED;

                continue;
            }

            $redacted[$key] = match (true) {
                is_array($value) => $this->redactArray($value),
                is_string($value) => $this->redactString($value),
                default => $value,
            };
        }

        return $redacted;
    }

    private function isSensitiveKey(string $key): bool
    {
        return preg_match(
            '/password|secret|token|authorization|cookie|credential|private[_-]?key|signing[_-]?key|content[_-]?key|recovery[_-]?code|plaintext|plain[_-]?text|dpop|proof|ticket|release[_-]?handle|raw[_-]?trust|trust[_-]?history|challenge[_-]?telemetry|interaction[_-]?summary/i',
            $key,
        ) === 1;
    }

    private function redactString(string $value): string
    {
        $value = preg_replace('/\bBearer\s+[^\s,;]+/i', 'Bearer '.self::REDACTED, $value)
            ?? $value;
        $value = preg_replace('/\bDPoP\s+[^\s,;]+/i', 'DPoP '.self::REDACTED, $value)
            ?? $value;

        return preg_replace(
            '/\b(password|secret|token|authorization|credential|recovery[_-]?code|content[_-]?key|plaintext|plain[_-]?text|proof|ticket|release[_-]?handle)\s*[:=]\s*[^\s,;]+/i',
            '$1='.self::REDACTED,
            $value,
        ) ?? $value;
    }
}
