<?php

namespace App\Support;

use Illuminate\Support\Str;

final class DeploymentConfiguration
{
    /** @return list<string> */
    public function issues(): array
    {
        $issues = [];
        $environment = (string) config('sharecapsules.deployment.environment');
        $deploymentId = (string) config('sharecapsules.deployment.id');
        $extensionChannel = (string) config('sharecapsules.extension.channel');
        $extensionId = (string) config('sharecapsules.extension.id');
        $oauthClientId = (string) config('sharecapsules.oauth.extension_client_id');
        $oauthRedirectUri = (string) config('sharecapsules.oauth.extension_redirect_uri');
        $ctxIssuer = (string) config('sharecapsules.ctx.issuer');
        $brokerUrl = (string) config('sharecapsules.broker.base_url');
        $sanctionHmacKey = (string) config('accounts.sanctions.email_hmac_key');
        $ledgerConnection = (string) config('accounts.deletion_ledger.connection');
        $replayRequired = (bool) config('accounts.deletion_ledger.replay_required');
        $restoreId = (string) config('accounts.deletion_ledger.restore_id');

        if (! in_array($environment, ['development', 'test', 'production'], true)) {
            $issues[] = 'deployment_environment_invalid';
        }

        if ($deploymentId === '') {
            $issues[] = 'deployment_id_missing';
        }

        if ($environment !== $extensionChannel) {
            $issues[] = 'extension_channel_mismatch';
        }

        if ($environment !== 'test' && config('session.driver') !== 'database') {
            $issues[] = 'account_session_driver_not_database';
        }

        if ($extensionId === '' || $oauthClientId === '' || $oauthRedirectUri === '') {
            $issues[] = 'extension_identity_missing';
        }

        if (! $this->isExactExtensionRedirect($extensionId, $oauthRedirectUri)) {
            $issues[] = 'extension_oauth_redirect_mismatch';
        }

        if (! Str::isUuid($oauthClientId)) {
            $issues[] = 'extension_oauth_client_id_invalid';
        }

        if ($environment === 'production') {
            if (! $this->isHttpsUrl($ctxIssuer)) {
                $issues[] = 'ctx_issuer_not_https';
            }

            if (! $this->isHttpsUrl($brokerUrl)) {
                $issues[] = 'broker_url_not_https';
            }

            if ($this->sameHost($ctxIssuer, $brokerUrl)) {
                $issues[] = 'broker_origin_not_distinct';
            }

            if ($this->isPlaceholder($extensionId) || $this->isPlaceholder($oauthClientId)) {
                $issues[] = 'production_identity_placeholder';
            }

            if (! $this->isValidProductionSecret($sanctionHmacKey)) {
                $issues[] = 'sanction_hmac_key_invalid';
            }

            if ($ledgerConnection === '' || $ledgerConnection === config('database.default')) {
                $issues[] = 'deletion_ledger_not_isolated';
            }
        }

        if ($replayRequired && ! Str::isUuid($restoreId)) {
            $issues[] = 'deletion_restore_id_invalid';
        }

        return $issues;
    }

    private function isHttpsUrl(string $value): bool
    {
        $parts = parse_url($value);

        return filter_var($value, FILTER_VALIDATE_URL) !== false
            && is_array($parts)
            && ($parts['scheme'] ?? null) === 'https'
            && isset($parts['host'])
            && ! isset($parts['user'])
            && ! isset($parts['pass'])
            && ! isset($parts['query'])
            && ! isset($parts['fragment'])
            && strlen($value) <= 2048;
    }

    private function isExactExtensionRedirect(string $extensionId, string $redirectUri): bool
    {
        return hash_equals(
            "https://{$extensionId}.chromiumapp.org/oauth/callback",
            $redirectUri,
        );
    }

    private function isPlaceholder(string $value): bool
    {
        return preg_match('/replace|placeholder|development|test|local|not-configured/i', $value) === 1;
    }

    private function sameHost(string $left, string $right): bool
    {
        $leftHost = parse_url($left, PHP_URL_HOST);
        $rightHost = parse_url($right, PHP_URL_HOST);

        return is_string($leftHost)
            && is_string($rightHost)
            && hash_equals(strtolower($leftHost), strtolower($rightHost));
    }

    private function isValidProductionSecret(string $value): bool
    {
        if ($value === '' || $this->isPlaceholder($value)) {
            return false;
        }

        if (str_starts_with($value, 'base64:')) {
            $decoded = base64_decode(substr($value, 7), true);

            return is_string($decoded) && strlen($decoded) === 32;
        }

        return strlen($value) === 32;
    }
}
