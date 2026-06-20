<?php

namespace Tests\Feature;

use Tests\TestCase;

final class CorrelationIdTest extends TestCase
{
    public function test_it_accepts_a_safe_correlation_identifier(): void
    {
        $response = $this
            ->withHeader('X-Correlation-ID', 'request-12345678')
            ->get('/');

        $response
            ->assertOk()
            ->assertHeader('X-Correlation-ID', 'request-12345678');
    }

    public function test_it_replaces_an_unsafe_correlation_identifier(): void
    {
        $response = $this
            ->withHeader('X-Correlation-ID', "unsafe\nheader")
            ->get('/');

        $response->assertOk();

        $correlationId = $response->headers->get('X-Correlation-ID');

        $this->assertIsString($correlationId);
        $this->assertMatchesRegularExpression(
            '/\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/',
            $correlationId,
        );
    }
}
