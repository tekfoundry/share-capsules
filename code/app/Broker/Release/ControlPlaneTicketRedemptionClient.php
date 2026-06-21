<?php

namespace App\Broker\Release;

use App\Ctx\Tickets\TicketRedemptionCode;
use Illuminate\Http\Client\Factory;
use Throwable;

final readonly class ControlPlaneTicketRedemptionClient implements TicketRedemptionClient
{
    public function __construct(private Factory $http) {}

    public function redeem(string $jti, string $ticketSha256): TicketRedemptionOutcome
    {
        try {
            $response = $this->http
                ->baseUrl(rtrim((string) config('sharecapsules.broker.control_plane_internal_url'), '/'))
                ->acceptJson()->asJson()
                ->withToken((string) config('sharecapsules.broker.callback_token'))
                ->timeout(5)->retry(2, 100, throw: false)
                ->post('/ctx/tickets/redeem', [
                    'jti' => $jti,
                    'ticket_sha256' => $ticketSha256,
                ]);

            $body = $response->json();
            if (! is_array($body) || array_is_list($body)) {
                return TicketRedemptionOutcome::unavailable();
            }
            $keys = array_keys($body);
            sort($keys);
            $code = is_string($body['code'] ?? null)
                ? TicketRedemptionCode::tryFrom($body['code'])
                : null;
            if ($keys !== ['code', 'type', 'version']
                || ($body['type'] ?? null) !== 'ctx-ticket-redemption'
                || ($body['version'] ?? null) !== 1
                || $code === null
                || ($code === TicketRedemptionCode::Committed && $response->status() !== 200)
                || ($code !== TicketRedemptionCode::Committed && $response->status() !== 409)) {
                return TicketRedemptionOutcome::unavailable();
            }

            return TicketRedemptionOutcome::responded($code);
        } catch (Throwable) {
            return TicketRedemptionOutcome::unavailable();
        }
    }
}
