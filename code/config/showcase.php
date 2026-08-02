<?php

return [
    'owner' => [
        'email' => env('SHOWCASE_CREATOR_EMAIL', 'info@tekfoundry.com'),
        'name' => env('SHOWCASE_CREATOR_NAME', 'Share Capsules Showcase'),
        'verified' => true,
        'interactive_login' => false,
    ],

    'assets' => [
        'public_root' => 'showcase',
        'images_path' => 'showcase/images',
        'capsules_path' => 'showcase/capsules',
    ],

    'signing' => [
        'strategy' => env('SHOWCASE_SIGNING_STRATEGY', 'fresh-per-generation'),
        'identity_label' => 'Share Capsules Showcase Creator',
        'persistent_secret_configured' => false,
    ],

    'generation' => [
        'enabled' => env('SHOWCASE_GENERATION_ENABLED', false),
        'overwrite_existing_capsules' => false,
        'default_revision' => 1,
    ],

    'bridge' => [
        'node_binary' => env('SHOWCASE_NODE_BINARY', 'node'),
        'script_path' => 'scripts/showcase-capsule-bridge.mjs',
        'timeout_seconds' => env('SHOWCASE_NODE_TIMEOUT_SECONDS', 30),
    ],
];
