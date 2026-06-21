<?php

namespace App\ViewerDevices;

final class ViewerDeviceRegistrationMessage
{
    public const TYPE = 'ctx-viewer-device-registration';

    public const VERSION = '1.0';

    public static function build(
        string $challengeId,
        string $deviceId,
        string $nonce,
        string $proofThumbprint,
        string $agreementThumbprint,
    ): string {
        return implode("\n", [
            self::TYPE,
            self::VERSION,
            "challenge_id:{$challengeId}",
            "device_id:{$deviceId}",
            "nonce:{$nonce}",
            "proof_jkt:{$proofThumbprint}",
            "agreement_jkt:{$agreementThumbprint}",
            '',
        ]);
    }
}
