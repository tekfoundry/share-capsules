<?php

namespace App\Broker\Release;

use App\Broker\Hpke\HpkeKeyReleaseWrapper;
use App\Broker\Keys\KeyProtectionContext;
use App\Broker\Keys\KeyProtectionService;
use App\Broker\Keys\ProtectedKeyMaterial;
use App\Ctx\Contracts\CanonicalJson;
use SensitiveParameter;

final readonly class PrepareKeyRelease
{
    public function __construct(
        private CtxTicketValidator $tickets,
        private DeviceProofValidator $proofs,
        private KeyProtectionService $protection,
        private HpkeKeyReleaseWrapper $hpke,
        private CanonicalJson $canonicalJson,
    ) {}

    public function prepare(
        #[SensitiveParameter] string $ticketCompact,
        #[SensitiveParameter] string $proofCompact,
        string $agreementPublicKey,
    ): PreparedKeyRelease {
        $ticket = $this->tickets->validate($ticketCompact);
        $agreementBytes = $this->proofs->validate($proofCompact, $ticket, $agreementPublicKey);
        $record = $ticket->record;
        $contentKey = $this->protection->recover(
            new ProtectedKeyMaterial(
                $record->protection_algorithm,
                $record->protection_key_id,
                $record->protection_nonce,
                $record->protected_content_key,
            ),
            new KeyProtectionContext($record->record_id),
        );
        $context = [
            'type' => 'ctx-key-release-context',
            'version' => 1,
            'broker' => (string) config('sharecapsules.broker.base_url'),
            'ticket_jti' => $ticket->jti,
            'capsule_id' => $ticket->context['capsule_id'],
            'capsule_revision' => $ticket->context['capsule_revision'],
            'payload_id' => $ticket->context['payload_id'],
            'release_handle' => $ticket->context['release_handle'],
            'action' => 'render',
            'cryptographic_suite' => 'ctx-capsule-v1',
            'agreement_jkt' => $ticket->agreementJkt,
        ];
        $info = "CTX-Key-Release-HPKE-v1\0".$this->canonicalJson->encode($context);
        $aad = "CTX-Key-Release-AAD-v1\0".$this->canonicalJson->encode([
            'ticket_sha256' => sodium_bin2base64(
                hash('sha256', $ticketCompact, true),
                SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
            ),
        ]);
        $wrapped = $this->hpke->wrap($contentKey, $agreementBytes, $info, $aad);

        return new PreparedKeyRelease(
            $record->record_id,
            $ticket->jti,
            sodium_bin2base64($wrapped->enc, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING),
            sodium_bin2base64($wrapped->ciphertext, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING),
        );
    }
}
