<?php

namespace Tests\Unit\Showcase;

use App\Showcase\ShowcaseConfiguration;
use InvalidArgumentException;
use Tests\TestCase;

final class ShowcaseConfigurationTest extends TestCase
{
    public function test_configuration_loads_secure_defaults(): void
    {
        $configuration = ShowcaseConfiguration::fromConfig();

        $this->assertFalse($configuration->generationEnabled);
        $this->assertSame('info@tekfoundry.com', $configuration->ownerEmail);
        $this->assertSame('Share Capsules Showcase', $configuration->ownerName);
        $this->assertTrue($configuration->ownerVerified);
        $this->assertFalse($configuration->interactiveLogin);
        $this->assertSame('showcase', $configuration->publicRoot);
        $this->assertSame('showcase/images', $configuration->imagesPath);
        $this->assertSame('showcase/capsules', $configuration->capsulesPath);
        $this->assertSame('fresh-per-generation', $configuration->signingStrategy);
        $this->assertSame('Share Capsules Showcase Creator', $configuration->signingIdentityLabel);
        $this->assertFalse($configuration->persistentSecretConfigured);
        $this->assertFalse($configuration->overwriteExistingCapsules);
        $this->assertSame(1, $configuration->defaultRevision);
    }

    public function test_interactive_login_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);

        new ShowcaseConfiguration(
            generationEnabled: true,
            ownerEmail: 'info@tekfoundry.com',
            ownerName: 'Share Capsules Showcase',
            ownerVerified: true,
            interactiveLogin: true,
            publicRoot: 'showcase',
            imagesPath: 'showcase/images',
            capsulesPath: 'showcase/capsules',
            signingStrategy: 'fresh-per-generation',
            signingIdentityLabel: 'Share Capsules Showcase Creator',
            persistentSecretConfigured: false,
            overwriteExistingCapsules: false,
            defaultRevision: 1,
        );
    }

    public function test_persistent_signing_secret_is_rejected_for_now(): void
    {
        $this->expectException(InvalidArgumentException::class);

        new ShowcaseConfiguration(
            generationEnabled: true,
            ownerEmail: 'info@tekfoundry.com',
            ownerName: 'Share Capsules Showcase',
            ownerVerified: true,
            interactiveLogin: false,
            publicRoot: 'showcase',
            imagesPath: 'showcase/images',
            capsulesPath: 'showcase/capsules',
            signingStrategy: 'fresh-per-generation',
            signingIdentityLabel: 'Share Capsules Showcase Creator',
            persistentSecretConfigured: true,
            overwriteExistingCapsules: false,
            defaultRevision: 1,
        );
    }
}
