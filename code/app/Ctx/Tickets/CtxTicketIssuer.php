<?php

namespace App\Ctx\Tickets;

use App\Ctx\Contracts\CtxV1;
use App\Ctx\SigningKeys\TicketSigningKeyStatus;
use App\Models\CtxAuthorizationTicket;
use App\Models\CtxTicketSigningKey;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Throwable;

final readonly class CtxTicketIssuer
{
    public function __construct(private TicketIdentifierSource $identifiers) {}

    public function issue(
        User $user,
        ViewerDevice $device,
        CtxTicketBindings $bindings,
        ?CarbonImmutable $now = null,
    ): IssuedCtxTicket {
        $now ??= CarbonImmutable::now();

        if ($user->email_verified_at === null || $user->isClosed()
            || (string) $device->user_id !== (string) $user->getKey()
            || $device->status !== ViewerDeviceStatus::Active
            || ! hash_equals($device->proof_jkt, $bindings->proofJkt)
            || ! hash_equals($device->agreement_jkt, $bindings->agreementJkt)) {
            throw new TicketIssuanceFailed('The account and device ticket bindings are unavailable.');
        }

        return DB::transaction(function () use ($user, $device, $bindings, $now): IssuedCtxTicket {
            $keys = CtxTicketSigningKey::query()
                ->where('status', TicketSigningKeyStatus::Active)
                ->lockForUpdate()
                ->get();
            if ($keys->count() !== 1) {
                throw new TicketIssuanceFailed('Exactly one active CTX ticket-signing key is required.');
            }
            $key = $keys->first();
            if (! $key instanceof CtxTicketSigningKey) {
                throw new TicketIssuanceFailed('The CTX ticket-signing key is unavailable.');
            }
            $identifier = $this->identifiers->identifier();
            if (preg_match('/\A[A-Za-z0-9_-]{16,128}\z/', $identifier) !== 1) {
                throw new TicketIssuanceFailed('The CTX ticket identifier source failed.');
            }
            $issuedAt = $now->getTimestamp();
            $expiresAt = $now->addSeconds(CtxV1::TICKET_LIFETIME_SECONDS);
            $header = [
                'typ' => CtxV1::TICKET_TYPE,
                'alg' => CtxV1::SIGNING_ALGORITHM,
                'kid' => $key->kid,
            ];
            $claims = [
                'iss' => (string) config('sharecapsules.ctx.issuer'),
                'aud' => $bindings->broker,
                'jti' => $identifier,
                'iat' => $issuedAt,
                'nbf' => $issuedAt,
                'exp' => $expiresAt->getTimestamp(),
                'ctx' => $bindings->publicClaims(),
            ];
            $signingInput = $this->encodeJson($header).'.'.$this->encodeJson($claims);

            try {
                $privateKey = sodium_base642bin(
                    $key->encrypted_private_key,
                    SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
                );
                $signature = sodium_crypto_sign_detached($signingInput, $privateKey);
            } catch (Throwable $exception) {
                throw new TicketIssuanceFailed('CTX ticket signing failed.', 0, $exception);
            }
            $compact = $signingInput.'.'.sodium_bin2base64(
                $signature,
                SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
            );

            CtxAuthorizationTicket::query()->create([
                'jti' => $identifier,
                'user_id' => $user->getKey(),
                'viewer_device_id' => $device->getKey(),
                'signing_kid' => $key->kid,
                'ticket_sha256' => hash('sha256', $compact),
                'broker' => $bindings->broker,
                'capsule_id' => $bindings->capsuleId,
                'capsule_revision' => $bindings->capsuleRevision,
                'policy_sha256' => $bindings->policySha256,
                'payload_id' => $bindings->payloadId,
                'release_handle' => $bindings->releaseHandle,
                'proof_jkt' => $bindings->proofJkt,
                'agreement_jkt' => $bindings->agreementJkt,
                'not_before' => $bindings->notBefore,
                'not_after' => $bindings->notAfter,
                'capsule_lifetime_limit' => $bindings->capsuleLifetimeLimit,
                'account_capsule_lifetime_limit' => $bindings->accountCapsuleLifetimeLimit,
                'automation_risk_issuer' => $bindings->automationRiskIssuer,
                'status' => 'pending',
                'issued_at' => $now,
                'expires_at' => $expiresAt,
            ]);

            return new IssuedCtxTicket($compact, $identifier, $expiresAt);
        });
    }

    /** @param array<string, mixed> $value */
    private function encodeJson(array $value): string
    {
        return sodium_bin2base64(
            json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES),
            SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
        );
    }
}
