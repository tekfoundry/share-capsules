<?php

namespace App\Broker\Registration;

final class NativeGrantSecretSource implements GrantSecretSource
{
    public function secret(): string
    {
        return sodium_bin2base64(random_bytes(32), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
    }
}
