<?php

namespace App\Broker\Registration;

use Illuminate\Http\Client\Factory;
use SensitiveParameter;
use Throwable;

final readonly class ControlPlaneRegistrationGrantAuthorizer implements RegistrationGrantAuthorizer
{
    public function __construct(private Factory $http) {}

    public function authorize(
        #[SensitiveParameter] string $grant,
        string $registrationId,
        string $capsuleId,
        string $payloadId,
        string $contentKeySha256,
    ): RegistrationGrantPrincipal {
        try {
            $response = $this->http
                ->baseUrl(rtrim((string) config('sharecapsules.broker.control_plane_internal_url'), '/'))
                ->acceptJson()
                ->asJson()
                ->withToken((string) config('sharecapsules.broker.callback_token'))
                ->timeout(5)
                ->retry(2, 100, throw: false)
                ->post('/internal/broker/registration-grants/redeem', [
                    'grant' => $grant,
                    'registration_id' => $registrationId,
                    'capsule_id' => $capsuleId,
                    'payload_id' => $payloadId,
                    'content_key_sha256' => $contentKeySha256,
                ]);

            $creatorId = $response->successful() ? $response->json('creator_id') : null;
            $capsuleRevision = $response->json('capsule_revision');
            $policySha256 = $response->json('policy_sha256');
            if (! is_string($creatorId) || $creatorId === '' || ! is_int($capsuleRevision)
                || ! is_string($policySha256)) {
                throw new RegistrationAuthorizationFailed('Content-key registration was not authorized.');
            }

            return new RegistrationGrantPrincipal($creatorId, $capsuleRevision, $policySha256);
        } catch (RegistrationAuthorizationFailed $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            throw new RegistrationAuthorizationFailed(
                'Content-key registration authorization is unavailable.',
                0,
                $exception,
            );
        }
    }
}
