<?php

namespace App\OAuth;

use Illuminate\Support\Str;
use InvalidArgumentException;

final readonly class ExtensionOAuthClientConfiguration
{
    /** @param list<string> $scopes */
    private function __construct(
        public string $id,
        public string $name,
        public string $redirectUri,
        public array $scopes,
    ) {}

    public static function fromConfig(): self
    {
        $id = (string) config('sharecapsules.oauth.extension_client_id');
        $name = (string) config('sharecapsules.oauth.extension_client_name');
        $redirectUri = (string) config('sharecapsules.oauth.extension_redirect_uri');
        $extensionId = (string) config('sharecapsules.extension.id');
        $scopes = config('sharecapsules.oauth.extension_scopes');

        if (! Str::isUuid($id)) {
            throw new InvalidArgumentException('The extension OAuth client ID must be a UUID.');
        }

        if ($name === '') {
            throw new InvalidArgumentException('The extension OAuth client name is required.');
        }

        if (filter_var($redirectUri, FILTER_VALIDATE_URL) === false
            || parse_url($redirectUri, PHP_URL_SCHEME) !== 'https') {
            throw new InvalidArgumentException('The extension OAuth redirect URI must be HTTPS.');
        }

        if (! hash_equals("https://{$extensionId}.chromiumapp.org/oauth/callback", $redirectUri)) {
            throw new InvalidArgumentException('The extension OAuth redirect URI must exactly match the extension ID.');
        }

        if (! is_array($scopes) || $scopes === []
            || array_filter(array_keys($scopes), 'is_string') !== array_keys($scopes)
            || array_filter(array_values($scopes), 'is_string') !== array_values($scopes)) {
            throw new InvalidArgumentException('The extension OAuth scopes must be a non-empty description map.');
        }

        return new self($id, $name, $redirectUri, array_keys($scopes));
    }
}
