<?php

namespace App\OAuth\Dpop;

use DateTimeImmutable;
use Laravel\Passport\Bridge\AccessToken as PassportAccessToken;
use Lcobucci\JWT\Configuration;
use Lcobucci\JWT\Signer\Key\InMemory;
use Lcobucci\JWT\Signer\Rsa\Sha256;
use League\OAuth2\Server\CryptKeyInterface;
use RuntimeException;
use SensitiveParameter;

final class DpopAccessToken extends PassportAccessToken
{
    private CryptKeyInterface $signingKey;

    private ?string $viewerDeviceId = null;

    private ?string $proofThumbprint = null;

    public function bindToDevice(string $viewerDeviceId, string $proofThumbprint): void
    {
        $this->viewerDeviceId = $viewerDeviceId;
        $this->proofThumbprint = $proofThumbprint;
    }

    public function viewerDeviceId(): ?string
    {
        return $this->viewerDeviceId;
    }

    public function proofThumbprint(): ?string
    {
        return $this->proofThumbprint;
    }

    public function isDeviceBound(): bool
    {
        return $this->viewerDeviceId !== null && $this->proofThumbprint !== null;
    }

    public function setPrivateKey(#[SensitiveParameter] CryptKeyInterface $privateKey): void
    {
        parent::setPrivateKey($privateKey);
        $this->signingKey = $privateKey;
    }

    public function toString(): string
    {
        $privateKeyContents = $this->signingKey->getKeyContents();

        if ($privateKeyContents === '') {
            throw new RuntimeException('Private key is empty');
        }

        $configuration = Configuration::forAsymmetricSigner(
            new Sha256,
            InMemory::plainText($privateKeyContents, $this->signingKey->getPassPhrase() ?? ''),
            InMemory::plainText('empty', 'empty'),
        );
        $builder = $configuration->builder()
            ->withHeader('typ', 'at+jwt')
            ->issuedBy(rtrim((string) config('app.url'), '/'))
            ->permittedFor($this->getClient()->getIdentifier())
            ->identifiedBy($this->getIdentifier())
            ->issuedAt(new DateTimeImmutable)
            ->canOnlyBeUsedAfter(new DateTimeImmutable)
            ->expiresAt($this->getExpiryDateTime())
            ->relatedTo($this->getUserIdentifier() ?? $this->getClient()->getIdentifier())
            ->withClaim('scopes', $this->getScopes());

        if ($this->proofThumbprint !== null) {
            $builder = $builder->withClaim('cnf', ['jkt' => $this->proofThumbprint]);
        }

        return $builder
            ->getToken($configuration->signer(), $configuration->signingKey())
            ->toString();
    }
}
