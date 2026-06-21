<?php

namespace App\Broker\Hpke;

use App\Broker\Keys\ContentKey;
use SensitiveParameter;
use Throwable;

final readonly class HpkeKeyReleaseWrapper
{
    private const KEM_SUITE_ID = "KEM\x00\x20";

    private const HPKE_SUITE_ID = "HPKE\x00\x20\x00\x01\x00\x02";

    public function __construct(private HpkeIkmSource $ikm) {}

    public function wrap(
        ContentKey $contentKey,
        #[SensitiveParameter] string $recipientPublicKey,
        string $info,
        string $aad,
    ): WrappedContentKey {
        try {
            if (strlen($recipientPublicKey) !== 32) {
                throw new HpkeWrappingFailed('The HPKE recipient key is invalid.');
            }
            $ephemeralIkm = $this->ikm->bytes();
            if (strlen($ephemeralIkm) !== 32) {
                throw new HpkeWrappingFailed('The HPKE randomness source failed.');
            }
            $dkpPrk = $this->labeledExtract('', 'dkp_prk', $ephemeralIkm, self::KEM_SUITE_ID);
            $ephemeralPrivate = $this->labeledExpand(
                $dkpPrk,
                'sk',
                '',
                32,
                self::KEM_SUITE_ID,
            );
            $enc = sodium_crypto_scalarmult_base($ephemeralPrivate);
            $dh = sodium_crypto_scalarmult($ephemeralPrivate, $recipientPublicKey);
            if ($dh === str_repeat("\0", 32)) {
                throw new HpkeWrappingFailed('The HPKE agreement result is invalid.');
            }
            $eaePrk = $this->labeledExtract('', 'eae_prk', $dh, self::KEM_SUITE_ID);
            $sharedSecret = $this->labeledExpand(
                $eaePrk,
                'shared_secret',
                $enc.$recipientPublicKey,
                32,
                self::KEM_SUITE_ID,
            );
            $pskIdHash = $this->labeledExtract('', 'psk_id_hash', '', self::HPKE_SUITE_ID);
            $infoHash = $this->labeledExtract('', 'info_hash', $info, self::HPKE_SUITE_ID);
            $keyScheduleContext = "\x00".$pskIdHash.$infoHash;
            $secret = $this->labeledExtract($sharedSecret, 'secret', '', self::HPKE_SUITE_ID);
            $key = $this->labeledExpand($secret, 'key', $keyScheduleContext, 32, self::HPKE_SUITE_ID);
            $nonce = $this->labeledExpand(
                $secret,
                'base_nonce',
                $keyScheduleContext,
                12,
                self::HPKE_SUITE_ID,
            );
            $tag = '';
            $ciphertext = openssl_encrypt(
                $contentKey->bytes(),
                'aes-256-gcm',
                $key,
                OPENSSL_RAW_DATA,
                $nonce,
                $tag,
                $aad,
                16,
            );
            if (! is_string($ciphertext) || strlen($tag) !== 16) {
                throw new HpkeWrappingFailed('HPKE content-key encryption failed.');
            }

            return new WrappedContentKey($enc, $ciphertext.$tag);
        } catch (HpkeWrappingFailed $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            throw new HpkeWrappingFailed('HPKE key wrapping failed.', 0, $exception);
        }
    }

    private function labeledExtract(string $salt, string $label, string $ikm, string $suiteId): string
    {
        return hash_hmac('sha256', 'HPKE-v1'.$suiteId.$label.$ikm, $salt, true);
    }

    private function labeledExpand(
        string $prk,
        string $label,
        string $info,
        int $length,
        string $suiteId,
    ): string {
        return $this->hkdfExpand(
            $prk,
            pack('n', $length).'HPKE-v1'.$suiteId.$label.$info,
            $length,
        );
    }

    private function hkdfExpand(string $prk, string $info, int $length): string
    {
        $output = '';
        $block = '';
        for ($counter = 1; strlen($output) < $length; $counter++) {
            $block = hash_hmac('sha256', $block.$info.chr($counter), $prk, true);
            $output .= $block;
        }

        return substr($output, 0, $length);
    }
}
