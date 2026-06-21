<?php

namespace App\Ctx\SigningKeys;

final class SodiumTicketSigningKeyGenerator implements TicketSigningKeyGenerator
{
    public function generate(): GeneratedTicketSigningKey
    {
        $keyPair = sodium_crypto_sign_keypair();

        return new GeneratedTicketSigningKey(
            publicKey: sodium_bin2base64(
                sodium_crypto_sign_publickey($keyPair),
                SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
            ),
            privateKey: sodium_bin2base64(
                sodium_crypto_sign_secretkey($keyPair),
                SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
            ),
        );
    }
}
