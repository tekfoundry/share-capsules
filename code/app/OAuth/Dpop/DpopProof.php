<?php

namespace App\OAuth\Dpop;

final readonly class DpopProof
{
    public function __construct(
        public string $jti,
        public string $thumbprint,
        public string $publicKey,
    ) {}
}
