<?php

namespace App\ViewerDevices;

use App\Models\ViewerDevice;
use Laravel\Passport\Passport;

final class ViewerDeviceLifecycleService
{
    public function suspend(ViewerDevice $device): void
    {
        $device->update([
            'status' => ViewerDeviceStatus::Suspended,
            'suspended_at' => now(),
        ]);
        $this->revokeTokens($device);
    }

    public function activate(ViewerDevice $device): void
    {
        $device->update([
            'status' => ViewerDeviceStatus::Active,
            'suspended_at' => null,
        ]);
    }

    public function revoke(ViewerDevice $device): void
    {
        if ($device->status !== ViewerDeviceStatus::Revoked) {
            $device->update([
                'status' => ViewerDeviceStatus::Revoked,
                'suspended_at' => null,
                'revoked_at' => now(),
            ]);
        }

        $this->revokeTokens($device);
    }

    public function revokeTokens(ViewerDevice $device): void
    {
        $accessTokenIds = Passport::token()->newQuery()
            ->where('viewer_device_id', $device->getKey())
            ->pluck('id');

        Passport::refreshToken()->newQuery()
            ->whereIn('access_token_id', $accessTokenIds)
            ->update(['revoked' => true]);
        Passport::token()->newQuery()
            ->whereIn('id', $accessTokenIds)
            ->update(['revoked' => true]);
    }
}
