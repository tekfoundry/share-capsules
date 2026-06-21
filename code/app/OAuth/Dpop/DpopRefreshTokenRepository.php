<?php

namespace App\OAuth\Dpop;

use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Support\Facades\DB;
use Laravel\Passport\Bridge\RefreshTokenRepository as PassportRefreshTokenRepository;
use Laravel\Passport\Passport;

final class DpopRefreshTokenRepository extends PassportRefreshTokenRepository
{
    public function __construct(
        Dispatcher $events,
    ) {
        parent::__construct($events);
    }

    public function isRefreshTokenRevoked(string $tokenId): bool
    {
        $binding = DB::table('oauth_refresh_tokens as refresh')
            ->join('oauth_access_tokens as access', 'access.id', '=', 'refresh.access_token_id')
            ->where('refresh.id', $tokenId)
            ->select([
                'refresh.revoked',
                'access.viewer_device_id',
                'access.proof_jkt',
                'access.user_id',
            ])
            ->first();

        if ($binding === null || $binding->viewer_device_id === null || $binding->proof_jkt === null) {
            return true;
        }

        $proof = request()->attributes->get(DpopProof::class);

        if (! $proof instanceof DpopProof || ! hash_equals($binding->proof_jkt, $proof->thumbprint)) {
            return true;
        }

        if ((bool) $binding->revoked) {
            $this->revokeDeviceTokenFamily($binding->viewer_device_id);

            return true;
        }

        return ! ViewerDevice::query()
            ->whereKey($binding->viewer_device_id)
            ->where('user_id', $binding->user_id)
            ->where('proof_jkt', $proof->thumbprint)
            ->where('status', ViewerDeviceStatus::Active)
            ->exists();
    }

    private function revokeDeviceTokenFamily(string $viewerDeviceId): void
    {
        $accessTokenIds = Passport::token()->newQuery()
            ->where('viewer_device_id', $viewerDeviceId)
            ->pluck('id');

        Passport::refreshToken()->newQuery()
            ->whereIn('access_token_id', $accessTokenIds)
            ->update(['revoked' => true]);
        Passport::token()->newQuery()
            ->whereIn('id', $accessTokenIds)
            ->update(['revoked' => true]);
    }
}
