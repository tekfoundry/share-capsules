<?php

namespace App\Broker\Registration;

use SensitiveParameter;

interface RegistrationGrantAuthorizer
{
    public function authorize(
        #[SensitiveParameter] string $grant,
        string $registrationId,
        string $capsuleId,
        string $payloadId,
        string $contentKeySha256,
    ): RegistrationGrantPrincipal;
}
