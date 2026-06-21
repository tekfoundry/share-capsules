<?php

namespace App\Ctx\Discovery;

use InvalidArgumentException;

final class CtxDiscoveryPath
{
    public static function forIssuer(string $issuer): string
    {
        $parts = parse_url($issuer);
        if (! is_array($parts) || ! isset($parts['scheme'], $parts['host'])) {
            throw new InvalidArgumentException('The CTX issuer is not a valid URL.');
        }

        $path = $parts['path'] ?? '';

        return '/.well-known/ctx-configuration'.($path === '/' ? '' : $path);
    }
}
