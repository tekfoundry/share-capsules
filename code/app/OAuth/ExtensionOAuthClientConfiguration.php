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
        $scopeDescriptions = config('sharecapsules.oauth.extension_scopes');
        $scopes = config('sharecapsules.oauth.bootstrap_scopes');

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

        if (! is_array($scopeDescriptions) || $scopeDescriptions === []
            || array_filter(array_keys($scopeDescriptions), 'is_string') !== array_keys($scopeDescriptions)
            || array_filter(array_values($scopeDescriptions), 'is_string') !== array_values($scopeDescriptions)
            || ! is_array($scopes) || $scopes === []
            || array_filter($scopes, 'is_string') !== $scopes
            || array_diff($scopes, array_keys($scopeDescriptions)) !== []) {
            throw new InvalidArgumentException('The extension OAuth scopes must be configured and described.');
        }

        return new self($id, $name, $redirectUri, array_values($scopes));
    }
}
