<?php

namespace App\Broker\Release;

use App\Ctx\Contracts\CanonicalJson;
use App\Models\BrokerDeviceProof;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use SensitiveParameter;
use Throwable;

final readonly class DeviceProofValidator
{
    public function __construct(private CanonicalJson $canonicalJson) {}

    public function validate(
        #[SensitiveParameter] string $compactProof,
        ValidatedTicket $ticket,
        string $agreementPublicKey,
        ?CarbonImmutable $now = null,
    ): string {
        $now ??= CarbonImmutable::now();
        try {
            $parts = explode('.', $compactProof);
            if (count($parts) !== 3) {
                throw new InvalidDeviceProof;
            }
            [$encodedHeader, $encodedClaims, $encodedSignature] = $parts;
            $header = $this->json($encodedHeader);
            $claims = $this->json($encodedClaims);
            $this->exact($header, ['alg', 'jwk', 'typ']);
            $jwk = $header['jwk'] ?? null;
            if ($header['typ'] !== 'ctx-key-release-proof+jwt' || $header['alg'] !== 'EdDSA'
                || ! is_array($jwk) || array_is_list($jwk)) {
                throw new InvalidDeviceProof;
            }
            $this->exact($jwk, ['crv', 'kty', 'x']);
            if ($jwk['kty'] !== 'OKP' || $jwk['crv'] !== 'Ed25519' || ! is_string($jwk['x'])) {
                throw new InvalidDeviceProof;
            }
            $proofPublicKey = $this->bytes($jwk['x'], 32);
            $thumbprint = $this->digest($this->canonicalJson->encode($jwk));
            $this->exact($claims, ['htm', 'htu', 'iat', 'jti', 'tth']);
            $iat = $claims['iat'] ?? null;
            if (! hash_equals($ticket->proofJkt, $thumbprint)
                || ($claims['htm'] ?? null) !== 'POST'
                || ($claims['htu'] ?? null) !== rtrim((string) config('sharecapsules.broker.base_url'), '/').'/releases'
                || ! is_int($iat) || $iat < $now->subSeconds(60)->getTimestamp()
                || $iat > $now->addSeconds(5)->getTimestamp()
                || ! is_string($claims['jti']) || preg_match('/\A[A-Za-z0-9_-]{16,128}\z/', $claims['jti']) !== 1
                || ! is_string($claims['tth']) || ! hash_equals($this->digest($ticket->compact), $claims['tth'])) {
                throw new InvalidDeviceProof;
            }
            $signature = $this->bytes($encodedSignature, 64);
            if (! sodium_crypto_sign_verify_detached(
                $signature,
                $encodedHeader.'.'.$encodedClaims,
                $proofPublicKey,
            )) {
                throw new InvalidDeviceProof;
            }
            $agreementBytes = $this->bytes($agreementPublicKey, 32);
            $agreementJwk = ['crv' => 'X25519', 'kty' => 'OKP', 'x' => $agreementPublicKey];
            if (! hash_equals(
                $ticket->agreementJkt,
                $this->digest($this->canonicalJson->encode($agreementJwk)),
            )) {
                throw new InvalidDeviceProof;
            }
            BrokerDeviceProof::query()->create([
                'jti' => $claims['jti'],
                'ticket_jti' => $ticket->jti,
                'expires_at' => $now->addSeconds(65),
            ]);

            return $agreementBytes;
        } catch (InvalidDeviceProof $exception) {
            throw $exception;
        } catch (UniqueConstraintViolationException $exception) {
            throw new InvalidDeviceProof('The device proof was replayed.', 0, $exception);
        } catch (Throwable $exception) {
            throw new InvalidDeviceProof('The device proof is invalid.', 0, $exception);
        }
    }

    /** @return array<string, mixed> */
    private function json(string $encoded): array
    {
        $value = json_decode(
            sodium_base642bin($encoded, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING),
            true,
            flags: JSON_THROW_ON_ERROR,
        );
        if (! is_array($value) || array_is_list($value)) {
            throw new InvalidDeviceProof;
        }

        return $value;
    }

    private function bytes(string $encoded, int $length): string
    {
        $bytes = sodium_base642bin($encoded, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
        if (strlen($bytes) !== $length
            || sodium_bin2base64($bytes, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING) !== $encoded) {
            throw new InvalidDeviceProof;
        }

        return $bytes;
    }

    private function digest(string $value): string
    {
        return sodium_bin2base64(hash('sha256', $value, true), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }

    /** @param array<string, mixed> $value @param list<string> $keys */
    private function exact(array $value, array $keys): void
    {
        $actual = array_keys($value);
        sort($actual);
        sort($keys);
        if ($actual !== $keys) {
            throw new InvalidDeviceProof;
        }
    }
}
