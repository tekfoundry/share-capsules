<?php

namespace Tests\Feature;

use Illuminate\Mail\MailManager;
use Symfony\Component\Mailer\Transport\TransportInterface;
use Tests\TestCase;

final class MailgunConfigurationTest extends TestCase
{
    public function test_mailgun_api_transport_is_available(): void
    {
        config()->set('services.mailgun', [
            'domain' => 'mg.sharecapsules.test',
            'secret' => 'test-mailgun-api-key',
            'scheme' => 'https',
            'endpoint' => 'api.mailgun.net',
        ]);

        $transport = app(MailManager::class)
            ->mailer('mailgun')
            ->getSymfonyTransport();

        $this->assertInstanceOf(TransportInterface::class, $transport);
    }
}
