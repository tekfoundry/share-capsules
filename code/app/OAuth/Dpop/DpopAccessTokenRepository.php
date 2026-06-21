<?php

namespace App\OAuth\Dpop;

use App\Models\User;
use App\Models\ViewerDevice;
use App\OAuth\ExtensionOAuthScope;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Contracts\Events\Dispatcher;
use Laravel\Passport\Bridge\AccessTokenRepository as PassportAccessTokenRepository;
use Laravel\Passport\Events\AccessTokenCreated;
use Laravel\Passport\Passport;
use League\OAuth2\Server\Entities\AccessTokenEntityInterface;
use League\OAuth2\Server\Entities\ClientEntityInterface;
use League\OAuth2\Server\Exception\OAuthServerException;

final class DpopAccessTokenRepository extends PassportAccessTokenRepository
{
    public function __construct(
        Dispatcher $events,
    ) {
        parent::__construct($events);
    }

    public function getNewToken(
        ClientEntityInterface $clientEntity,
        array $scopes,
        ?string $userIdentifier = null,
    ): AccessTokenEntityInterface {
        $identifiers = array_map(
            static fn ($scope): string => $scope->getIdentifier(),
            $scopes,
        );

        if ($userIdentifier !== null && ! User::query()
            ->whereKey($userIdentifier)
            ->whereNull('closed_at')
            ->exists()) {
            throw OAuthServerException::invalidGrant('The account is unavailable.');
        }
        $requiresDevice = array_intersect($identifiers, [
            ExtensionOAuthScope::CtxAuthorize->value,
            ExtensionOAuthScope::CapsuleCreate->value,
        ]) !== [];

        if ($requiresDevice && in_array(ExtensionOAuthScope::Connect->value, $identifiers, true)) {
            throw OAuthServerException::invalidScope(
                ExtensionOAuthScope::Connect->value.' '.implode(' ', $identifiers),
            );
        }

        $token = new DpopAccessToken($userIdentifier, $scopes, $clientEntity);

        if (! $requiresDevice) {
            return $token;
        }

        $request = request();
        $proof = $request->attributes->get(DpopProof::class);

        if (! $proof instanceof DpopProof || $userIdentifier === null) {
            throw OAuthServerException::invalidRequest('DPoP');
        }

        $deviceQuery = ViewerDevice::query()
            ->where('user_id', $userIdentifier)
            ->where('proof_jkt', $proof->thumbprint)
            ->where('status', ViewerDeviceStatus::Active);
        $requestedDeviceId = $request->string('device_id')->toString();

        if ($request->string('grant_type')->toString() === 'authorization_code'
            && $requestedDeviceId === '') {
            throw OAuthServerException::invalidRequest('device_id');
        }

        if ($requestedDeviceId !== '') {
            $deviceQuery->whereKey($requestedDeviceId);
        }

        $device = $deviceQuery->first();

        if (! $device instanceof ViewerDevice) {
            throw OAuthServerException::invalidGrant('The Viewer device is unavailable.');
        }

        $token->bindToDevice((string) $device->getKey(), $proof->thumbprint);

        return $token;
    }

    public function persistNewAccessToken(AccessTokenEntityInterface $accessTokenEntity): void
    {
        Passport::token()->forceFill([
            'id' => $id = $accessTokenEntity->getIdentifier(),
            'user_id' => $userId = $accessTokenEntity->getUserIdentifier(),
            'viewer_device_id' => $accessTokenEntity instanceof DpopAccessToken
                ? $accessTokenEntity->viewerDeviceId()
                : null,
            'proof_jkt' => $accessTokenEntity instanceof DpopAccessToken
                ? $accessTokenEntity->proofThumbprint()
                : null,
            'client_id' => $clientId = $accessTokenEntity->getClient()->getIdentifier(),
            'scopes' => $accessTokenEntity->getScopes(),
            'revoked' => false,
            'expires_at' => $accessTokenEntity->getExpiryDateTime(),
        ])->save();

        $this->events->dispatch(new AccessTokenCreated($id, $userId, $clientId));
    }
}
