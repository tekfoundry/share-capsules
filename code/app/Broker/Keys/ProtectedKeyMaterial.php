<?php

namespace App\Broker\Keys;

final readonly class ProtectedKeyMaterial
{
    public function __construct(
        public string $algorithm,
        public string $keyId,
        public string $nonce,
        public string $ciphertext,
    ) {}

    public function withCiphertext(string $ciphertext): self
    {
        return new self($this->algorithm, $this->keyId, $this->nonce, $ciphertext);
    }
}
