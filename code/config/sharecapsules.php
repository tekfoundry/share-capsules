<?php

return [
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
            'development-not-configured',
        ),
    ],

    'ctx' => [
        'issuer' => env('SHARECAPSULES_CTX_ISSUER', 'http://localhost:3003'),
    ],

    'broker' => [
        'base_url' => env('SHARECAPSULES_BROKER_URL', 'http://localhost:3003'),
    ],
];
