<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Throwable;

final class HealthCheckService
{
    public function __construct(
        private readonly DeploymentConfiguration $deploymentConfiguration,
    ) {}

    /** @return array{status: string, deployment: array{environment: string, id: string}, services: array<string, array{status: string}>} */
    public function check(): array
    {
        $services = [
            'configuration' => $this->checkConfiguration(),
            'mysql' => $this->checkService('mysql', fn () => DB::select('SELECT 1')),
            'redis' => $this->checkService('redis', fn () => Redis::connection()->command('ping')),
        ];

        $healthy = collect($services)->every(
            fn (array $service): bool => $service['status'] === 'healthy',
        );

        return [
            'status' => $healthy ? 'healthy' : 'unhealthy',
            'deployment' => [
                'environment' => (string) config('sharecapsules.deployment.environment'),
                'id' => (string) config('sharecapsules.deployment.id'),
            ],
            'services' => $services,
        ];
    }

    /** @return array{status: string} */
    private function checkConfiguration(): array
    {
        $issues = $this->deploymentConfiguration->issues();

        if ($issues !== []) {
            Log::error('Deployment configuration health check failed', [
                'issues' => $issues,
            ]);
        }

        return ['status' => $issues === [] ? 'healthy' : 'unhealthy'];
    }

    /** @return array{status: string} */
    private function checkService(string $service, callable $check): array
    {
        try {
            $check();

            return ['status' => 'healthy'];
        } catch (Throwable $exception) {
            Log::error('Dependency health check failed', [
                'service' => $service,
                'exception_class' => $exception::class,
            ]);

            return ['status' => 'unhealthy'];
        }
    }
}
