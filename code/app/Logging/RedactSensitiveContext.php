<?php

namespace App\Logging;

use Monolog\LogRecord;

final class RedactSensitiveContext
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
            '/password|secret|token|authorization|cookie|private[_-]?key|content[_-]?key|recovery[_-]?code/i',
            $key,
        ) === 1;
    }

    private function redactString(string $value): string
    {
        $value = preg_replace('/\bBearer\s+[^\s,;]+/i', 'Bearer '.self::REDACTED, $value)
            ?? $value;

        return preg_replace(
            '/\b(password|secret|token|authorization|recovery[_-]?code)\s*[:=]\s*[^\s,;]+/i',
            '$1='.self::REDACTED,
            $value,
        ) ?? $value;
    }
}
