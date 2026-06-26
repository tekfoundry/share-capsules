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
            'sanction_hmac_key_invalid',
            'deletion_ledger_not_isolated',
        ], app(DeploymentConfiguration::class)->issues());
    }

    public function test_production_accepts_a_dedicated_32_byte_sanction_hmac_key(): void
    {
        config()->set('sharecapsules.deployment.environment', 'production');
        config()->set('accounts.sanctions.email_hmac_key', 'base64:'.base64_encode(random_bytes(32)));

        $this->assertNotContains(
            'sanction_hmac_key_invalid',
            app(DeploymentConfiguration::class)->issues(),
        );
    }

    public function test_production_service_identities_reject_user_information_queries_and_fragments(): void
    {
        config()->set('sharecapsules.deployment.environment', 'production');
        config()->set('sharecapsules.ctx.issuer', 'https://user@sharecapsules.com');
        config()->set('sharecapsules.broker.base_url', 'https://broker.sharecapsules.com?tenant=one');

        $this->assertContains('ctx_issuer_not_https', app(DeploymentConfiguration::class)->issues());
        $this->assertContains('broker_url_not_https', app(DeploymentConfiguration::class)->issues());
    }

    public function test_production_requires_a_distinct_broker_origin_host(): void
    {
        config()->set('sharecapsules.deployment.environment', 'production');
        config()->set('sharecapsules.ctx.issuer', 'https://sharecapsules.com');
        config()->set('sharecapsules.broker.base_url', 'https://sharecapsules.com');

        $this->assertContains(
            'broker_origin_not_distinct',
            app(DeploymentConfiguration::class)->issues(),
        );
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

    public function test_production_requires_an_isolated_deletion_ledger_connection(): void
    {
        config()->set('sharecapsules.deployment.environment', 'production');
        config()->set('accounts.deletion_ledger.connection', config('database.default'));

        $this->assertContains(
            'deletion_ledger_not_isolated',
            app(DeploymentConfiguration::class)->issues(),
        );
    }

    public function test_restore_mode_requires_a_unique_restore_identifier(): void
    {
        config()->set('accounts.deletion_ledger.replay_required', true);
        config()->set('accounts.deletion_ledger.restore_id', 'reused-name');

        $this->assertContains(
            'deletion_restore_id_invalid',
            app(DeploymentConfiguration::class)->issues(),
        );
    }
}
