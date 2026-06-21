<?php

namespace App\Broker\Support;

use App\Ctx\Contracts\ServiceIdentity;
use InvalidArgumentException;

final class BrokerDeploymentConfiguration
{
    /** @return list<string> */
    public function issues(): array
    {
        $issues = [];
        $applicationDatabase = (string) config('database.connections.mysql.database');
        $applicationUsername = (string) config('database.connections.mysql.username');
        $brokerDatabase = (string) config('database.connections.broker.database');
        $brokerUsername = (string) config('database.connections.broker.username');
        $credential = (string) config('sharecapsules.broker.control_plane_token');
        $auditChannel = (string) config('sharecapsules.broker.audit_channel');
        $kmsDriver = (string) config('sharecapsules.broker.kms.driver');

        if (config('sharecapsules.component') !== 'broker') {
            $issues[] = 'broker_component_invalid';
        }

        if (config('database.default') !== 'broker') {
            $issues[] = 'broker_default_connection_invalid';
        }

        if ($brokerDatabase === '' || hash_equals($applicationDatabase, $brokerDatabase)) {
            $issues[] = 'broker_database_not_isolated';
        }

        if ($brokerUsername === '' || hash_equals($applicationUsername, $brokerUsername)) {
            $issues[] = 'broker_database_credentials_not_isolated';
        }

        if (strlen($credential) < 32 || $this->isPlaceholder($credential)) {
            $issues[] = 'broker_control_plane_token_invalid';
        }

        if ($auditChannel === ''
            || $auditChannel === config('logging.default')
            || ! is_array(config("logging.channels.{$auditChannel}"))) {
            $issues[] = 'broker_audit_channel_not_isolated';
        }

        try {
            ServiceIdentity::fromString((string) config('sharecapsules.broker.base_url'));
        } catch (InvalidArgumentException) {
            $issues[] = 'broker_identity_invalid';
        }

        if (config('sharecapsules.deployment.environment') === 'production'
            && $kmsDriver !== 'managed') {
            $issues[] = 'broker_kms_not_managed';
        }

        if (config('sharecapsules.deployment.environment') !== 'production'
            && $kmsDriver !== 'local') {
            $issues[] = 'broker_kms_driver_invalid';
        }

        if ($kmsDriver === 'local' && ! $this->validLocalKmsConfiguration()) {
            $issues[] = 'broker_local_kms_invalid';
        }

        return $issues;
    }

    private function isPlaceholder(string $value): bool
    {
        return preg_match('/replace|placeholder|change-me|development|test-only/i', $value) === 1;
    }

    private function validLocalKmsConfiguration(): bool
    {
        $configured = (string) config('sharecapsules.broker.kms.local_master_key');
        $decoded = str_starts_with($configured, 'base64:')
            ? base64_decode(substr($configured, 7), true)
            : false;
        $keyId = (string) config('sharecapsules.broker.kms.key_id');

        return is_string($decoded)
            && strlen($decoded) === 32
            && preg_match('/\A[A-Za-z0-9_-]{16,128}\z/', $keyId) === 1;
    }
}
