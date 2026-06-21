<?php

namespace Tests\Unit;

use App\Support\DeploymentConfiguration;
use Tests\TestCase;

final class DeploymentConfigurationTest extends TestCase
{
    public function test_test_identity_is_valid_and_distinct(): void
    {
        $this->assertSame([], app(DeploymentConfiguration::class)->issues());
    }

    public function test_production_rejects_non_https_and_placeholder_identities(): void
    {
        config()->set('sharecapsules.deployment.environment', 'production');
        config()->set('sharecapsules.deployment.id', 'production-primary');
        config()->set('sharecapsules.extension.channel', 'production');
        config()->set('sharecapsules.extension.id', 'replace-with-production-extension-id');
        config()->set('sharecapsules.oauth.extension_client_id', 'replace-with-production-client-id');
        config()->set('sharecapsules.oauth.extension_redirect_uri', 'https://wrong.chromiumapp.org/oauth/callback');
        config()->set('sharecapsules.ctx.issuer', 'http://sharecapsules.com');
        config()->set('sharecapsules.broker.base_url', 'http://broker.sharecapsules.com');
        config()->set('session.driver', 'database');

        $this->assertEqualsCanonicalizing([
            'ctx_issuer_not_https',
            'broker_url_not_https',
            'production_identity_placeholder',
            'extension_oauth_redirect_mismatch',
            'extension_oauth_client_id_invalid',
        ], app(DeploymentConfiguration::class)->issues());
    }

    public function test_extension_callback_must_exactly_match_the_configured_extension_identity(): void
    {
        config()->set('sharecapsules.extension.id', 'abcdefghijklmnop');
        config()->set('sharecapsules.oauth.extension_redirect_uri', 'https://attacker.example/callback');

        $this->assertContains(
            'extension_oauth_redirect_mismatch',
            app(DeploymentConfiguration::class)->issues(),
        );
    }

    public function test_non_test_deployments_require_database_backed_account_sessions(): void
    {
        config()->set('sharecapsules.deployment.environment', 'development');
        config()->set('sharecapsules.extension.channel', 'development');
        config()->set('session.driver', 'redis');

        $this->assertContains(
            'account_session_driver_not_database',
            app(DeploymentConfiguration::class)->issues(),
        );
    }
}
