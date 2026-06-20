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
        config()->set('sharecapsules.ctx.issuer', 'http://sharecapsules.com');
        config()->set('sharecapsules.broker.base_url', 'http://broker.sharecapsules.com');

        $this->assertEqualsCanonicalizing([
            'ctx_issuer_not_https',
            'broker_url_not_https',
            'production_identity_placeholder',
        ], app(DeploymentConfiguration::class)->issues());
    }
}
