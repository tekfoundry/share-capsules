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

    'deletion_ledger' => [
        'connection' => env('ACCOUNT_DELETION_LEDGER_CONNECTION', env('DB_CONNECTION', 'sqlite')),
        'replay_required' => env('ACCOUNT_DELETION_REPLAY_REQUIRED', false),
        'restore_id' => env('ACCOUNT_DELETION_RESTORE_ID'),
        'retention_days' => 30,
    ],
];
