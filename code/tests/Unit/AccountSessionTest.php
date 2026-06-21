<?php

namespace Tests\Unit;

use App\Account\Sessions\AccountSession;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;

final class AccountSessionTest extends TestCase
{
    public function test_it_describes_common_browser_and_platform_families(): void
    {
        $session = new AccountSession(
            id: 'session-id',
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
            lastActivityAt: CarbonImmutable::now(),
            isCurrent: true,
        );

        $this->assertSame('Chrome', $session->browserLabel());
        $this->assertSame('macOS', $session->platformLabel());
    }

    public function test_it_fails_to_neutral_labels_for_unrecognized_user_agents(): void
    {
        $session = new AccountSession(
            id: 'session-id',
            ipAddress: null,
            userAgent: null,
            lastActivityAt: CarbonImmutable::now(),
            isCurrent: false,
        );

        $this->assertSame('Unknown browser', $session->browserLabel());
        $this->assertSame('Unknown platform', $session->platformLabel());
    }
}
