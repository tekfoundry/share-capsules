<?php

namespace Tests\Unit\Ctx;

use App\Ctx\SigningKeys\SigningKeyLifecycleViolation;
use App\Ctx\SigningKeys\TicketSigningKeyLifecycle;
use App\Ctx\SigningKeys\TicketSigningKeyStatus;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class TicketSigningKeyLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_rotation_publishes_a_new_key_before_activation_and_overlaps_the_retiring_key(): void
    {
        $lifecycle = app(TicketSigningKeyLifecycle::class);
        $startedAt = CarbonImmutable::parse('2026-06-21T12:00:00Z');
        $first = $lifecycle->stage($startedAt);

        $lifecycle->activate($first->kid, $startedAt->addMinute());
        $second = $lifecycle->stage($startedAt->addMinutes(2));

        $this->assertSame(
            [$first->kid, $second->kid],
            $lifecycle->publicKeys($startedAt->addMinutes(2))->pluck('kid')->sort()->values()->all(),
        );
        $this->assertSame(TicketSigningKeyStatus::Published, $second->status);

        $lifecycle->activate($second->kid, $startedAt->addMinutes(3));
        $first->refresh();

        $this->assertSame(TicketSigningKeyStatus::Retiring, $first->status);
        $this->assertTrue($first->publish_until?->equalTo($startedAt->addMinutes(4)->addSeconds(5)));
        $this->assertSame(
            [$first->kid, $second->kid],
            $lifecycle->publicKeys($startedAt->addMinutes(4))->pluck('kid')->sort()->values()->all(),
        );
        $this->assertSame(
            [$second->kid],
            $lifecycle->publicKeys($startedAt->addMinutes(4)->addSeconds(5))->pluck('kid')->all(),
        );
    }

    public function test_emergency_revocation_removes_a_key_immediately(): void
    {
        $lifecycle = app(TicketSigningKeyLifecycle::class);
        $now = CarbonImmutable::parse('2026-06-21T12:00:00Z');
        $key = $lifecycle->stage($now);
        $lifecycle->activate($key->kid, $now);

        $lifecycle->revoke($key->kid, $now->addSecond());

        $this->assertSame([], $lifecycle->publicKeys($now->addSecond())->all());
        $this->assertSame(TicketSigningKeyStatus::Revoked, $key->refresh()->status);
    }

    public function test_only_a_published_key_can_be_activated(): void
    {
        $lifecycle = app(TicketSigningKeyLifecycle::class);
        $now = CarbonImmutable::parse('2026-06-21T12:00:00Z');
        $key = $lifecycle->stage($now);
        $lifecycle->activate($key->kid, $now);

        $this->expectException(SigningKeyLifecycleViolation::class);
        $lifecycle->activate($key->kid, $now->addSecond());
    }

    public function test_key_material_is_unique_and_the_private_key_is_encrypted_at_rest(): void
    {
        $lifecycle = app(TicketSigningKeyLifecycle::class);
        $now = CarbonImmutable::parse('2026-06-21T12:00:00Z');
        $first = $lifecycle->stage($now);
        $second = $lifecycle->stage($now);

        $this->assertNotSame($first->kid, $second->kid);
        $this->assertNotSame($first->public_key, $second->public_key);
        $this->assertSame(43, strlen($first->public_key));
        $this->assertNotSame(
            $first->encrypted_private_key,
            $first->getRawOriginal('encrypted_private_key'),
        );
        $this->assertStringNotContainsString(
            $first->encrypted_private_key,
            (string) $first->getRawOriginal('encrypted_private_key'),
        );
    }

    public function test_it_refuses_to_publish_more_keys_than_the_v1_jwks_allows(): void
    {
        $lifecycle = app(TicketSigningKeyLifecycle::class);
        $now = CarbonImmutable::parse('2026-06-21T12:00:00Z');

        for ($index = 0; $index < 16; $index++) {
            $lifecycle->stage($now);
        }

        $this->expectException(SigningKeyLifecycleViolation::class);
        $lifecycle->stage($now);
    }
}
