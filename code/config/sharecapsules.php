<?php

use App\OAuth\ExtensionOAuthScope;

return [
    'public' => [
        'repository_url' => env('SHARECAPSULES_PUBLIC_REPOSITORY_URL') ?: 'https://github.com/tekfoundry/share-capsules',
    ],

    'deployment' => [
        'environment' => env('SHARECAPSULES_ENVIRONMENT', 'development'),
        'id' => env('SHARECAPSULES_DEPLOYMENT_ID', 'local'),
    ],

    'extension' => [
        'channel' => env('SHARECAPSULES_EXTENSION_CHANNEL', 'development'),
        'id' => env('SHARECAPSULES_EXTENSION_ID', 'development-not-configured'),
    ],

    'oauth' => [
        'extension_client_id' => env(
            'SHARECAPSULES_OAUTH_EXTENSION_CLIENT_ID',
            '01977ac8-793e-72d4-a234-bd581e773e7e',
        ),
        'extension_redirect_uri' => env(
            'SHARECAPSULES_OAUTH_EXTENSION_REDIRECT_URI',
            'https://development-not-configured.chromiumapp.org/oauth/callback',
        ),
        'extension_client_name' => 'Share Capsules Viewer Extension',
        'extension_scopes' => [
            ExtensionOAuthScope::Connect->value => 'Connect the Viewer extension to this account.',
            ExtensionOAuthScope::CtxAuthorize->value => 'Request access to protected Capsules using this Viewer device.',
        ],
        'bootstrap_scopes' => [ExtensionOAuthScope::Connect->value],
        'device_scopes' => [ExtensionOAuthScope::CtxAuthorize->value],
        'access_token_ttl_minutes' => 10,
        'refresh_token_ttl_days' => 30,
        'refresh_lock_seconds' => 15,
        'refresh_lock_wait_seconds' => 5,
    ],

    'ctx' => [
        'issuer' => env('SHARECAPSULES_CTX_ISSUER', 'http://localhost:3003'),
    ],

    'broker' => [
        'base_url' => env('SHARECAPSULES_BROKER_URL', 'http://localhost:3003'),
    ],
];
