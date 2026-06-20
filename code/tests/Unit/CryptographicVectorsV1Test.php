<?php

namespace Tests\Unit;

use JsonException;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class CryptographicVectorsV1Test extends TestCase
{
    /** @var array<string, mixed> */
    private array $vectors;

    /**
     * @throws JsonException
     */
    protected function setUp(): void
    {
        parent::setUp();

        $path = dirname(__DIR__, 2).'/packages/test-fixtures/src/vectors/cryptographic-vectors-v1.json';
        $contents = file_get_contents($path);
        if ($contents === false) {
            throw new RuntimeException('Unable to read the shared cryptographic vectors.');
        }

        $decoded = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($decoded)) {
            throw new RuntimeException('The shared cryptographic vectors must contain an object.');
        }

        $this->vectors = $decoded;
    }

    public function test_vector_set_is_versioned_and_conspicuously_test_only(): void
    {
        $this->assertSame('ctx-capsule-cryptographic-vectors', $this->vectors['vector_set']);
        $this->assertSame(1, $this->vectors['version']);
        $this->assertSame(
            'TEST-ONLY KEY MATERIAL. NEVER USE THESE KEYS OR NONCES IN PRODUCTION.',
            $this->vectors['warning'],
        );
    }

    public function test_php_agrees_on_canonical_byte_hashes_and_entry_commitment(): void
    {
        foreach (['canonical_json', 'policy', 'manifest'] as $section) {
            /** @var array{canonical_utf8: string, sha256_base64url: string} $vector */
            $vector = $this->vectors[$section];
            $this->assertSame(
                $vector['sha256_base64url'],
                $this->sha256Base64Url($vector['canonical_utf8']),
                "SHA-256 mismatch for {$section}",
            );
        }

        /** @var array{recipe: array{length: int, modulus: int}, sha256_base64url: string} $entry */
        $entry = $this->vectors['entry_commitment'];
        $this->assertSame(
            $entry['sha256_base64url'],
            $this->sha256Base64Url($this->byteRecipe($entry['recipe'])),
        );
    }

    public function test_php_verifies_manifest_and_ticket_ed25519_signatures(): void
    {
        /** @var array{canonical_utf8: string, ed25519: array{public_key_hex: string, signature_hex: string}} $manifest */
        $manifest = $this->vectors['manifest'];
        $publicKey = $this->fromHex($manifest['ed25519']['public_key_hex']);

        $this->assertTrue(sodium_crypto_sign_verify_detached(
            $this->fromHex($manifest['ed25519']['signature_hex']),
            $manifest['canonical_utf8'],
            $publicKey,
        ));

        /** @var array{signing_input_ascii: string, signature_hex: string} $ticket */
        $ticket = $this->vectors['ticket'];
        $this->assertTrue(sodium_crypto_sign_verify_detached(
            $this->fromHex($ticket['signature_hex']),
            $ticket['signing_input_ascii'],
            $publicKey,
        ));
    }

    public function test_php_reproduces_and_opens_aes_256_gcm_payload_vector(): void
    {
        /** @var array{plaintext_recipe: array{length: int, modulus: int}, content_key_hex: string, nonce_hex: string, aad_utf8: string, ciphertext_hex: string} $vector */
        $vector = $this->vectors['payload_encryption'];
        $plaintext = $this->byteRecipe($vector['plaintext_recipe']);
        $key = $this->fromHex($vector['content_key_hex']);
        $nonce = $this->fromHex($vector['nonce_hex']);
        $tag = '';

        $ciphertext = openssl_encrypt(
            $plaintext,
            'aes-256-gcm',
            $key,
            OPENSSL_RAW_DATA,
            $nonce,
            $tag,
            $vector['aad_utf8'],
            16,
        );
        $this->assertIsString($ciphertext);
        $this->assertSame($vector['ciphertext_hex'], bin2hex($ciphertext.$tag));

        $decrypted = openssl_decrypt(
            $ciphertext,
            'aes-256-gcm',
            $key,
            OPENSSL_RAW_DATA,
            $nonce,
            $tag,
            $vector['aad_utf8'],
        );
        $this->assertSame($plaintext, $decrypted);
    }

    public function test_php_agrees_on_ticket_claim_and_hpke_context_bindings(): void
    {
        /** @var array{policy: array{sha256_base64url: string}, ticket: array{claims: array<string, mixed>, compact: string}, hpke_key_release: array{info_hex: string, aad_hex: string}} $vectors */
        $vectors = $this->vectors;
        $claims = $vectors['ticket']['claims'];
        $this->assertSame(
            ['aud', 'ctx', 'exp', 'iat', 'iss', 'jti', 'nbf'],
            $this->sortedKeys($claims),
        );
        $this->assertSame(60, $claims['exp'] - $claims['iat']);
        $this->assertLessThanOrEqual($claims['iat'], $claims['nbf']);

        /** @var array<string, mixed> $ctx */
        $ctx = $claims['ctx'];
        $this->assertSame([
            'action',
            'agreement_jkt',
            'capsule_id',
            'capsule_revision',
            'cryptographic_suite',
            'payload_id',
            'policy_sha256',
            'proof_jkt',
            'release_handle',
            'version',
        ], $this->sortedKeys($ctx));
        $this->assertSame('render', $ctx['action']);
        $this->assertSame('ctx-capsule-v1', $ctx['cryptographic_suite']);
        $this->assertSame($vectors['policy']['sha256_base64url'], $ctx['policy_sha256']);

        $expectedAad = "CTX-Key-Release-AAD-v1\0".json_encode([
            'ticket_sha256' => $this->sha256Base64Url($vectors['ticket']['compact']),
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        $this->assertSame($vectors['hpke_key_release']['aad_hex'], bin2hex($expectedAad));

        $info = $this->fromHex($vectors['hpke_key_release']['info_hex']);
        $this->assertStringStartsWith("CTX-Key-Release-HPKE-v1\0", $info);
        $this->assertStringContainsString((string) $ctx['release_handle'], $info);
        $this->assertStringContainsString((string) $ctx['agreement_jkt'], $info);
    }

    /**
     * @param  array{length: int, modulus: int}  $recipe
     */
    private function byteRecipe(array $recipe): string
    {
        $bytes = '';
        for ($index = 0; $index < $recipe['length']; $index++) {
            $bytes .= chr($index % $recipe['modulus']);
        }

        return $bytes;
    }

    private function sha256Base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode(hash('sha256', $value, true)), '+/', '-_'), '=');
    }

    private function fromHex(string $value): string
    {
        $decoded = hex2bin($value);
        if ($decoded === false) {
            throw new RuntimeException('Vector contains invalid hexadecimal data.');
        }

        return $decoded;
    }

    /**
     * @param  array<string, mixed>  $value
     * @return list<string>
     */
    private function sortedKeys(array $value): array
    {
        $keys = array_keys($value);
        sort($keys, SORT_STRING);

        return $keys;
    }
}
