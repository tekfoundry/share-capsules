<?php

namespace Tests\Unit\Broker;

use App\Broker\Release\ControlPlaneTicketRedemptionClient;
use App\Ctx\Contracts\CtxErrorCode;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class ControlPlaneTicketRedemptionClientTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('sharecapsules.broker.control_plane_internal_url', 'https://provider.example.test/internal/broker');
        config()->set('sharecapsules.broker.callback_token', 'broker-callback-secret');
    }

    public function test_it_preserves_a_reviewed_denial_from_the_authenticated_control_plane(): void
    {
        Http::fake(['*' => Http::response([
            'type' => 'ctx-ticket-redemption',
            'version' => 1,
            'code' => 'account_capsule_limit_reached',
        ], 409)]);

        $outcome = $this->client()->redeem('ticket-identifier-0001', str_repeat('a', 64));

        $this->assertFalse($outcome->committed());
        $this->assertSame(CtxErrorCode::AccountCapsuleLimitReached, $outcome->publicError());
        Http::assertSent(fn ($request): bool => $request->hasHeader('Authorization', 'Bearer broker-callback-secret')
            && $request->data() === [
                'jti' => 'ticket-identifier-0001',
                'ticket_sha256' => str_repeat('a', 64),
            ]);
    }

    public function test_it_accepts_only_an_exact_committed_response_and_status(): void
    {
        Http::fake(['*' => Http::response([
            'type' => 'ctx-ticket-redemption',
            'version' => 1,
            'code' => 'committed',
        ], 200)]);

        $this->assertTrue($this->client()->redeem('ticket-identifier-0001', str_repeat('a', 64))->committed());
    }

    public function test_malformed_unknown_or_status_mismatched_responses_fail_to_availability_only(): void
    {
        foreach ([
            [['type' => 'ctx-ticket-redemption', 'version' => 1, 'code' => 'raw_score'], 409],
            [['type' => 'ctx-ticket-redemption', 'version' => 1, 'code' => 'committed', 'detail' => 'secret'], 200],
            [['type' => 'ctx-ticket-redemption', 'version' => 1, 'code' => 'ticket_expired'], 200],
        ] as [$body, $status]) {
            Http::fake(['*' => Http::response($body, $status)]);
            $outcome = $this->client()->redeem('ticket-identifier-0001', str_repeat('a', 64));

            $this->assertSame(CtxErrorCode::TemporarilyUnavailable, $outcome->publicError());
        }
    }

    private function client(): ControlPlaneTicketRedemptionClient
    {
        return new ControlPlaneTicketRedemptionClient(app(Factory::class));
    }
}
