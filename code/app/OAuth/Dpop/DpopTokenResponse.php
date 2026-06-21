<?php

namespace App\OAuth\Dpop;

use Laravel\Passport\Passport;
use League\OAuth2\Server\ResponseTypes\BearerTokenResponse;
use LogicException;
use Psr\Http\Message\ResponseInterface;

final class DpopTokenResponse extends BearerTokenResponse
{
    public function generateHttpResponse(ResponseInterface $response): ResponseInterface
    {
        $bound = $this->accessToken instanceof DpopAccessToken
            && $this->accessToken->isDeviceBound();
        $responseParams = [
            'token_type' => $bound ? 'DPoP' : 'Bearer',
            'expires_in' => $this->accessToken->getExpiryDateTime()->getTimestamp() - time(),
            'access_token' => $this->accessToken->toString(),
            'scope' => implode(' ', array_map(
                static fn ($scope): string => $scope->getIdentifier(),
                $this->accessToken->getScopes(),
            )),
        ];

        if (isset($this->refreshToken) && $bound) {
            $payload = json_encode([
                'client_id' => $this->accessToken->getClient()->getIdentifier(),
                'refresh_token_id' => $this->refreshToken->getIdentifier(),
                'access_token_id' => $this->accessToken->getIdentifier(),
                'scopes' => $this->accessToken->getScopes(),
                'user_id' => $this->accessToken->getUserIdentifier(),
                'expire_time' => $this->refreshToken->getExpiryDateTime()->getTimestamp(),
            ]);

            if ($payload === false) {
                throw new LogicException('Error encountered JSON encoding the refresh token payload');
            }

            $responseParams['refresh_token'] = $this->encrypt($payload);
        } elseif (isset($this->refreshToken)) {
            Passport::refreshToken()->newQuery()
                ->whereKey($this->refreshToken->getIdentifier())
                ->update(['revoked' => true]);
        }

        $encoded = json_encode($responseParams);

        if ($encoded === false) {
            throw new LogicException('Error encountered JSON encoding response parameters');
        }

        $response = $response
            ->withStatus(200)
            ->withHeader('pragma', 'no-cache')
            ->withHeader('cache-control', 'no-store')
            ->withHeader('content-type', 'application/json; charset=UTF-8');
        $response->getBody()->write($encoded);

        return $response;
    }
}
