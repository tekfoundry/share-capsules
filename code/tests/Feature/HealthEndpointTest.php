<?php

namespace Tests\Feature;

use Tests\TestCase;

final class HealthEndpointTest extends TestCase
{
    public function test_it_reports_application_dependencies_as_healthy(): void
    {
        $response = $this->getJson('/up');

        $response
            ->assertOk()
            ->assertHeader('X-Correlation-ID')
            ->assertExactJson([
                'status' => 'healthy',
                'deployment' => [
                    'environment' => 'test',
                    'id' => 'automated-test',
                ],
                'services' => [
                    'configuration' => ['status' => 'healthy'],
                    'deletion_replay' => ['status' => 'healthy'],
                    'mysql' => ['status' => 'healthy'],
                    'redis' => ['status' => 'healthy'],
                ],
            ]);
    }
}
