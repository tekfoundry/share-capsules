<?php

namespace App\OAuth;

use Laravel\Passport\Client;
use Laravel\Passport\Passport;

final class ExtensionOAuthClientProvisioner
{
    public function provision(ExtensionOAuthClientConfiguration $configuration): Client
    {
        /** @var Client $client */
        $client = Passport::client()->newQuery()->updateOrCreate(
            ['id' => $configuration->id],
            [
                'name' => $configuration->name,
                'secret' => null,
                'provider' => 'users',
                'redirect_uris' => [$configuration->redirectUri],
                'grant_types' => ['authorization_code', 'refresh_token'],
                'revoked' => false,
            ],
        );

        return $client;
    }
}
