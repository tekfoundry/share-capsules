<?php

namespace App\Support;

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
        $ctxIssuer = (string) config('sharecapsules.ctx.issuer');
        $brokerUrl = (string) config('sharecapsules.broker.base_url');

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

        if ($extensionId === '' || $oauthClientId === '') {
            $issues[] = 'extension_identity_missing';
        }

        if ($environment === 'production') {
            if (! $this->isHttpsUrl($ctxIssuer)) {
                $issues[] = 'ctx_issuer_not_https';
            }

            if (! $this->isHttpsUrl($brokerUrl)) {
                $issues[] = 'broker_url_not_https';
            }

            if ($this->isPlaceholder($extensionId) || $this->isPlaceholder($oauthClientId)) {
                $issues[] = 'production_identity_placeholder';
            }
        }

        return $issues;
    }

    private function isHttpsUrl(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_URL) !== false
            && parse_url($value, PHP_URL_SCHEME) === 'https';
    }

    private function isPlaceholder(string $value): bool
    {
        return preg_match('/replace|placeholder|development|test|local|not-configured/i', $value) === 1;
    }
}
