<?php

namespace App\ViewerDevices;

use App\Models\User;
use App\Models\ViewerDevice;
use App\Models\ViewerDeviceChallenge;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use SodiumException;

final class ViewerDeviceRegistrationService
{
    private const CHALLENGE_TTL_MINUTES = 5;

    private const AGREEMENT_INFO = 'ctx-viewer-device-registration-agreement-v1';

    public function createChallenge(
        User $user,
        string $deviceId,
        OkpPublicKey $proofKey,
        OkpPublicKey $agreementKey,
    ): ViewerDeviceChallengeIssue {
        if (hash_equals($proofKey->raw, $agreementKey->raw)) {
            throw ValidationException::withMessages([
                'agreement_key' => 'Proof and agreement keys must use distinct key material.',
            ]);
        }

        $id = (string) Str::uuid7();
        $nonceRaw = random_bytes(32);
        $nonce = $this->encode($nonceRaw);
        $serverPrivateKey = random_bytes(32);
        $serverPublicKeyRaw = sodium_crypto_scalarmult_base($serverPrivateKey);

        try {
            $sharedSecret = sodium_crypto_scalarmult($serverPrivateKey, $agreementKey->raw);
        } catch (SodiumException) {
            throw ValidationException::withMessages([
                'agreement_key' => 'The agreement key cannot establish an X25519 shared secret.',
            ]);
        } finally {
            sodium_memzero($serverPrivateKey);
        }

        $message = ViewerDeviceRegistrationMessage::build(
            $id,
            $deviceId,
            $nonce,
            $proofKey->thumbprint,
            $agreementKey->thumbprint,
        );
        $confirmationKey = hash_hkdf(
            'sha256',
            $sharedSecret,
            32,
            self::AGREEMENT_INFO,
            $nonceRaw,
        );
        sodium_memzero($sharedSecret);
        $expectedConfirmation = hash_hmac('sha256', $message, $confirmationKey, true);
        sodium_memzero($confirmationKey);
        $expiresAt = now()->addMinutes(self::CHALLENGE_TTL_MINUTES);
        $serverAgreementPublicKey = $this->encode($serverPublicKeyRaw);

        ViewerDeviceChallenge::query()->create([
            'id' => $id,
            'device_id' => $deviceId,
            'user_id' => $user->getKey(),
            'nonce' => $nonce,
            'proof_public_key' => $proofKey->encoded,
            'proof_jkt' => $proofKey->thumbprint,
            'agreement_public_key' => $agreementKey->encoded,
            'agreement_jkt' => $agreementKey->thumbprint,
            'server_agreement_public_key' => $serverAgreementPublicKey,
            'agreement_confirmation_hash' => $expectedConfirmation,
            'expires_at' => $expiresAt,
        ]);

        return new ViewerDeviceChallengeIssue(
            $id,
            $nonce,
            $serverAgreementPublicKey,
            $expiresAt,
        );
    }

    public function register(
        User $user,
        string $challengeId,
        string $name,
        string $proofSignature,
        string $agreementConfirmation,
    ): ViewerDevice {
        return DB::transaction(function () use (
            $user,
            $challengeId,
            $name,
            $proofSignature,
            $agreementConfirmation,
        ): ViewerDevice {
            $challenge = ViewerDeviceChallenge::query()
                ->whereKey($challengeId)
                ->where('user_id', $user->getKey())
                ->lockForUpdate()
                ->first();

            if (! $challenge || $challenge->consumed_at || $challenge->expires_at->isPast()) {
                throw ValidationException::withMessages([
                    'challenge_id' => 'The device registration challenge is invalid or expired.',
                ]);
            }

            $message = ViewerDeviceRegistrationMessage::build(
                $challenge->getKey(),
                $challenge->device_id,
                $challenge->nonce,
                $challenge->proof_jkt,
                $challenge->agreement_jkt,
            );
            $signature = $this->decodeExact($proofSignature, 64, 'proof_signature');
            $confirmation = $this->decodeExact(
                $agreementConfirmation,
                32,
                'agreement_confirmation',
            );
            $proofPublicKey = $this->decodeExact(
                $challenge->proof_public_key,
                32,
                'proof_signature',
            );

            if (! sodium_crypto_sign_verify_detached($signature, $message, $proofPublicKey)) {
                throw ValidationException::withMessages([
                    'proof_signature' => 'The proof-key possession signature is invalid.',
                ]);
            }

            if (! hash_equals($challenge->agreement_confirmation_hash, $confirmation)) {
                throw ValidationException::withMessages([
                    'agreement_confirmation' => 'The agreement-key possession proof is invalid.',
                ]);
            }

            try {
                $device = ViewerDevice::query()->create([
                    'id' => $challenge->device_id,
                    'user_id' => $user->getKey(),
                    'name' => $name,
                    'proof_public_key' => $challenge->proof_public_key,
                    'proof_jkt' => $challenge->proof_jkt,
                    'agreement_public_key' => $challenge->agreement_public_key,
                    'agreement_jkt' => $challenge->agreement_jkt,
                    'status' => ViewerDeviceStatus::Active,
                ]);
            } catch (QueryException $exception) {
                if (! in_array((string) $exception->getCode(), ['23000', '23505'], true)) {
                    throw $exception;
                }

                throw ValidationException::withMessages([
                    'device' => 'One or more of these device keys are already registered.',
                ]);
            }

            $challenge->forceFill(['consumed_at' => now()])->save();

            return $device;
        }, attempts: 3);
    }

    private function encode(string $value): string
    {
        return sodium_bin2base64($value, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }

    private function decodeExact(string $value, int $bytes, string $field): string
    {
        try {
            $decoded = sodium_base642bin($value, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
        } catch (SodiumException) {
            throw ValidationException::withMessages([
                $field => "The {$field} is not valid canonical base64url.",
            ]);
        }

        if (strlen($decoded) !== $bytes || $this->encode($decoded) !== $value) {
            throw ValidationException::withMessages([
                $field => "The {$field} has an invalid length or encoding.",
            ]);
        }

        return $decoded;
    }
}
