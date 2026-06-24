<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

final class ViewerInstallController extends Controller
{
    public function __invoke(Request $request): View
    {
        return view('public.viewer-install', [
            'returnTo' => $this->safeReturnTo($request->query('return_to')),
        ]);
    }

    private function safeReturnTo(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);
        if ($value === '' || strlen($value) > 2_048 || preg_match('/[\x00-\x1F\x7F]/', $value)) {
            return null;
        }

        $parts = parse_url($value);
        if (! is_array($parts)) {
            return null;
        }

        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        if ($scheme !== 'https' && $scheme !== 'http') {
            return null;
        }

        if (($parts['host'] ?? '') === '' || isset($parts['user']) || isset($parts['pass']) || isset($parts['fragment'])) {
            return null;
        }

        parse_str((string) ($parts['query'] ?? ''), $query);
        foreach (array_keys($query) as $key) {
            if ($this->queryKeyLooksSensitive((string) $key)) {
                return null;
            }
        }

        return $value;
    }

    private function queryKeyLooksSensitive(string $key): bool
    {
        return preg_match(
            '/(?:^|[_-])(token|code|secret|password|credential|session|ticket|proof|key|dpop|recovery|refresh|access)(?:$|[_-])/i',
            $key,
        ) === 1;
    }
}
