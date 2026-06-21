<?php

namespace App\Broker\Support;

use Illuminate\Support\Facades\DB;
use Throwable;

final class BrokerHealthCheck
{
    public function __construct(
        private readonly BrokerDeploymentConfiguration $configuration,
    ) {}

    /** @return array{status: string, component: string, services: array<string, array{status: string}>} */
    public function check(): array
    {
        $services = [
            'configuration' => [
                'status' => $this->configuration->issues() === [] ? 'healthy' : 'unhealthy',
            ],
            'storage' => $this->storageStatus(),
        ];

        return [
            'status' => collect($services)->every(
                fn (array $service): bool => $service['status'] === 'healthy',
            ) ? 'healthy' : 'unhealthy',
            'component' => 'broker',
            'services' => $services,
        ];
    }

    /** @return array{status: string} */
    private function storageStatus(): array
    {
        try {
            DB::connection('broker')->select('SELECT 1');

            return ['status' => 'healthy'];
        } catch (Throwable) {
            return ['status' => 'unhealthy'];
        }
    }
}
