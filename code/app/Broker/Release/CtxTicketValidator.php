<?php

namespace App\Broker\Release;

use App\Broker\Lifecycle\BrokerContentKeyStatus;
use App\Ctx\Contracts\CtxV1;
use App\Models\BrokerContentKey;
use Carbon\CarbonImmutable;
use Throwable;

final readonly class CtxTicketValidator
{
    public function __construct(private TicketPublicKeyResolver $keys) {}

    public function validate(string $compact, ?CarbonImmutable $now = null): ValidatedTicket
    {
        $now ??= CarbonImmutable::now();
        try {
            $parts = explode('.', $compact);
            if (count($parts) !== 3) {
                throw new InvalidKeyRelease;
            }
            [$encodedHeader, $encodedClaims, $encodedSignature] = $parts;
            $header = $this->json($encodedHeader);
            $claims = $this->json($encodedClaims);
            $this->exact($header, ['alg', 'kid', 'typ']);
            if ($header['typ'] !== CtxV1::TICKET_TYPE || $header['alg'] !== 'EdDSA'
                || ! is_string($header['kid'])) {
                throw new InvalidKeyRelease;
            }
            $publicKey = $this->keys->resolve((string) config('sharecapsules.ctx.issuer'), $header['kid']);
            $signature = $this->bytes($encodedSignature, 64);
            if (! sodium_crypto_sign_verify_detached($signature, $encodedHeader.'.'.$encodedClaims, $publicKey)) {
                throw new InvalidKeyRelease;
            }
            $this->exact($claims, ['aud', 'ctx', 'exp', 'iat', 'iss', 'jti', 'nbf']);
            $ctx = $claims['ctx'] ?? null;
            if (! is_array($ctx) || array_is_list($ctx)) {
                throw new InvalidKeyRelease;
            }
            $this->exact($ctx, [
                'action', 'agreement_jkt', 'capsule_id', 'capsule_revision',
                'cryptographic_suite', 'payload_id', 'policy_sha256', 'proof_jkt',
                'release_handle', 'version',
            ]);
            $iat = $claims['iat'] ?? null;
            $nbf = $claims['nbf'] ?? null;
            $exp = $claims['exp'] ?? null;
            if ($claims['iss'] !== config('sharecapsules.ctx.issuer')
                || $claims['aud'] !== config('sharecapsules.broker.base_url')
                || ! is_string($claims['jti']) || ! is_int($iat) || ! is_int($nbf) || ! is_int($exp)
                || $nbf > $iat || $exp !== $iat + 60
                || $now->getTimestamp() < $nbf - 5 || $now->getTimestamp() > $exp + 5
                || ($ctx['version'] ?? null) !== 1 || ($ctx['action'] ?? null) !== 'render'
                || ($ctx['cryptographic_suite'] ?? null) !== CtxV1::CRYPTOGRAPHIC_SUITE) {
                throw new InvalidKeyRelease;
            }
            $record = BrokerContentKey::query()
                ->where('release_handle', $ctx['release_handle'])
                ->where('capsule_id', $ctx['capsule_id'])
                ->where('capsule_revision', $ctx['capsule_revision'])
                ->where('policy_sha256', $ctx['policy_sha256'])
                ->where('payload_id', $ctx['payload_id'])
                ->where('status', BrokerContentKeyStatus::Active->value)
                ->first();
            if (! $record instanceof BrokerContentKey) {
                throw new InvalidKeyRelease;
            }

            return new ValidatedTicket(
                $compact,
                $claims['jti'],
                $ctx['proof_jkt'],
                $ctx['agreement_jkt'],
                $ctx,
                $record,
            );
        } catch (InvalidKeyRelease $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            throw new InvalidKeyRelease('The CTX ticket is invalid.', 0, $exception);
        }
    }

    /** @return array<string, mixed> */
    private function json(string $encoded): array
    {
        $decoded = sodium_base642bin($encoded, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
        $value = json_decode($decoded, true, flags: JSON_THROW_ON_ERROR);
        if (! is_array($value) || array_is_list($value)) {
            throw new InvalidKeyRelease;
        }

        return $value;
    }

    private function bytes(string $encoded, int $length): string
    {
        $value = sodium_base642bin($encoded, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
        if (strlen($value) !== $length) {
            throw new InvalidKeyRelease;
        }

        return $value;
    }

    /** @param array<string, mixed> $value @param list<string> $keys */
    private function exact(array $value, array $keys): void
    {
        $actual = array_keys($value);
        sort($actual);
        sort($keys);
        if ($actual !== $keys) {
            throw new InvalidKeyRelease;
        }
    }
}
