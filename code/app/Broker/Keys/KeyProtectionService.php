<?php

namespace App\Broker\Keys;

interface KeyProtectionService
{
    public function protect(ContentKey $contentKey, KeyProtectionContext $context): ProtectedKeyMaterial;

    /** The returned plaintext key must remain inside the broker runtime. */
    public function recover(ProtectedKeyMaterial $protected, KeyProtectionContext $context): ContentKey;
}
