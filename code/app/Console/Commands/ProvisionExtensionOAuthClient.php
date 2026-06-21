<?php

namespace App\Console\Commands;

use App\OAuth\ExtensionOAuthClientConfiguration;
use App\OAuth\ExtensionOAuthClientProvisioner;
use Illuminate\Console\Command;

final class ProvisionExtensionOAuthClient extends Command
{
    protected $signature = 'ctx:provision-extension-client';

    protected $description = 'Create or reconcile the fixed public OAuth client used by the Viewer extension';

    public function handle(ExtensionOAuthClientProvisioner $provisioner): int
    {
        $client = $provisioner->provision(ExtensionOAuthClientConfiguration::fromConfig());

        $this->components->info("Extension OAuth client {$client->getKey()} is ready.");

        return self::SUCCESS;
    }
}
