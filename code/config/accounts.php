<?php

return [
    'terms' => [
        'version' => env('ACCOUNT_TERMS_VERSION', '2026-06-20'),
    ],

    'closure' => [
        'recovery_days' => 30,
        'completion_link_minutes' => 10,
    ],
];
