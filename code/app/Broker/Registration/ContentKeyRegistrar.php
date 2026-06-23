<?php

namespace App\Broker\Registration;

use App\Broker\Audit\BrokerAuditSink;
use App\Broker\Keys\ContentKey;
use App\Broker\Keys\KeyProtectionContext;
use App\Broker\Keys\KeyProtectionService;
use App\Broker\Lifecycle\BrokerContentKeyStatus;
use App\Models\BrokerContentKey;
use Illuminate\Support\Facades\DB;
use SensitiveParameter;

final readonly class ContentKeyRegistrar
{
    public function __construct(
        private RegistrationGrantAuthorizer $authorizer,
        private KeyProtectionService $protection,
        private OpaqueIdentifierSource $identifiers,
        private BrokerAuditSink $audit,
    ) {}

    public function register(
        #[SensitiveParameter] string $grant,
        string $registrationId,
        string $capsuleId,
        string $payloadId,
        ContentKey $contentKey,
    ): RegisteredContentKey {
        $contentKeySha256 = sodium_bin2base64(
            hash('sha256', $contentKey->bytes(), true),
            SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
        );
        $principal = $this->authorizer->authorize(
            $grant,
            $registrationId,
            $capsuleId,
            $payloadId,
            $contentKeySha256,
        );

        return DB::connection('broker')->transaction(function () use (
            $registrationId,
            $capsuleId,
            $payloadId,
            $contentKeySha256,
            $contentKey,
            $principal,
        ): RegisteredContentKey {
            $existing = BrokerContentKey::query()
                ->where('registration_id', $registrationId)
                ->lockForUpdate()
                ->first();
            if ($existing instanceof BrokerContentKey) {
                $matches = is_string($existing->creator_id)
                    && in_array($existing->status, [BrokerContentKeyStatus::Pending, BrokerContentKeyStatus::Active], true)
                    && hash_equals($existing->creator_id, $principal->creatorId)
                    && hash_equals($existing->capsule_id, $capsuleId)
                    && $existing->capsule_revision === $principal->capsuleRevision
                    && hash_equals($existing->payload_id, $payloadId)
                    && hash_equals($existing->policy_sha256, $principal->policySha256)
                    && hash_equals($existing->content_key_sha256, $contentKeySha256);
                if (! $matches) {
                    throw new RegistrationAuthorizationFailed('Registration identifier reuse was rejected.');
                }

                return new RegisteredContentKey($existing->release_handle, false);
            }

            $recordId = $this->identifiers->identifier();
            $releaseHandle = $this->identifiers->identifier();
            $protected = $this->protection->protect($contentKey, new KeyProtectionContext($recordId));
            BrokerContentKey::query()->create([
                'record_id' => $recordId,
                'registration_id' => $registrationId,
                'release_handle' => $releaseHandle,
                'creator_id' => $principal->creatorId,
                'capsule_id' => $capsuleId,
                'capsule_revision' => $principal->capsuleRevision,
                'payload_id' => $payloadId,
                'policy_sha256' => $principal->policySha256,
                'content_key_sha256' => $contentKeySha256,
                'protection_algorithm' => $protected->algorithm,
                'protection_key_id' => $protected->keyId,
                'protection_nonce' => $protected->nonce,
                'protected_content_key' => $protected->ciphertext,
                'status' => BrokerContentKeyStatus::Pending,
                'pending_expires_at' => now()->addMinutes((int) config('sharecapsules.capsules.pending_ttl_minutes')),
            ]);
            $this->audit->record('broker.content_key_registered', [
                'record_id' => $recordId,
                'creator_id' => $principal->creatorId,
                'capsule_id' => $capsuleId,
                'payload_id' => $payloadId,
            ]);

            return new RegisteredContentKey($releaseHandle, true);
        });
    }
}
