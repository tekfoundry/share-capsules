<?php

namespace App\Broker\Registration;

use App\Models\BrokerRegistrationGrant;
use App\Models\User;
use App\Models\ViewerDevice;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use SensitiveParameter;

final class RegistrationGrantService
{
    private const LIFETIME_SECONDS = 60;

    public function __construct(private readonly GrantSecretSource $secrets) {}

    public function issue(
        User $user,
        ViewerDevice $device,
        string $registrationId,
        string $capsuleId,
        int $capsuleRevision,
        string $payloadId,
        string $policySha256,
        string $contentKeySha256,
        ?CarbonImmutable $now = null,
    ): IssuedRegistrationGrant {
        $now ??= CarbonImmutable::now();
        $token = $this->secrets->secret();

        $expiresAt = $now->addSeconds(self::LIFETIME_SECONDS);
        DB::transaction(function () use (
            $token,
            $user,
            $device,
            $registrationId,
            $capsuleId,
            $capsuleRevision,
            $payloadId,
            $policySha256,
            $contentKeySha256,
            $expiresAt,
        ): void {
            $grant = BrokerRegistrationGrant::query()
                ->where('registration_id', $registrationId)
                ->lockForUpdate()
                ->first();
            if ($grant instanceof BrokerRegistrationGrant) {
                $matches = (string) $grant->user_id === (string) $user->getKey()
                    && (string) $grant->viewer_device_id === (string) $device->getKey()
                    && hash_equals($grant->capsule_id, $capsuleId)
                    && $grant->capsule_revision === $capsuleRevision
                    && hash_equals($grant->payload_id, $payloadId)
                    && hash_equals($grant->policy_sha256, $policySha256)
                    && hash_equals($grant->content_key_sha256, $contentKeySha256);
                if (! $matches) {
                    throw new InvalidRegistrationGrant('Registration identifier reuse was rejected.');
                }

                $grant->forceFill([
                    'token_hash' => hash('sha256', $token),
                    'expires_at' => $expiresAt,
                    'redeemed_at' => null,
                ])->save();

                return;
            }

            BrokerRegistrationGrant::query()->create([
                'token_hash' => hash('sha256', $token),
                'user_id' => $user->getKey(),
                'viewer_device_id' => $device->getKey(),
                'registration_id' => $registrationId,
                'capsule_id' => $capsuleId,
                'capsule_revision' => $capsuleRevision,
                'payload_id' => $payloadId,
                'policy_sha256' => $policySha256,
                'content_key_sha256' => $contentKeySha256,
                'expires_at' => $expiresAt,
            ]);
        });

        return new IssuedRegistrationGrant($token, $expiresAt);
    }

    public function redeem(
        #[SensitiveParameter] string $token,
        string $registrationId,
        string $capsuleId,
        string $payloadId,
        string $contentKeySha256,
        ?CarbonImmutable $now = null,
    ): RegistrationGrantPrincipal {
        $now ??= CarbonImmutable::now();

        return DB::transaction(function () use (
            $token,
            $registrationId,
            $capsuleId,
            $payloadId,
            $contentKeySha256,
            $now,
        ): RegistrationGrantPrincipal {
            $grant = BrokerRegistrationGrant::query()
                ->where('token_hash', hash('sha256', $token))
                ->lockForUpdate()
                ->first();

            if (! $grant instanceof BrokerRegistrationGrant
                || $grant->expires_at->lessThanOrEqualTo($now)
                || ! hash_equals($grant->registration_id, $registrationId)
                || ! hash_equals($grant->capsule_id, $capsuleId)
                || ! hash_equals($grant->payload_id, $payloadId)
                || ! hash_equals($grant->content_key_sha256, $contentKeySha256)) {
                throw new InvalidRegistrationGrant('The broker registration grant is invalid.');
            }

            if ($grant->redeemed_at === null) {
                $grant->forceFill(['redeemed_at' => $now])->save();
            }

            return new RegistrationGrantPrincipal(
                (string) $grant->user_id,
                $grant->capsule_revision,
                $grant->policy_sha256,
            );
        });
    }
}
