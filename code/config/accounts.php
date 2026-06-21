<?php

return [
    'terms' => [
        'version' => env('ACCOUNT_TERMS_VERSION', '2026-06-20'),
    ],

    'closure' => [
        'recovery_days' => 30,
        'completion_link_minutes' => 10,
    ],

    'sanctions' => [
        'email_hmac_key' => env(
            'ACCOUNT_SANCTION_HMAC_KEY',
            'development-only-sanction-key-00',
        ),
        'tombstone_max_days' => 90,
    ],
];
