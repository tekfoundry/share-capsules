# Creator Signing-Key Recovery V1

Status: Experimental normative contract
Last updated: 2026-06-21

## Purpose

Define the local encrypted recovery bundle and independent recovery code used to restore a Share Capsules Creator Ed25519 signing key without making an account password or Share Capsules service a decryption input.

## Recovery code

Creator tooling generates exactly 32 random bytes from the browser cryptographic random source and encodes them as canonical unpadded base64url. The resulting 43-character recovery code is generated independently from the signing key, account password, bundle salt, and encryption nonce.

The code is high-entropy key material, not a human-selected password. Implementations therefore use HKDF rather than a password-stretching construction. A malformed code or any decoded length other than 32 bytes fails before decryption.

## Bundle protection

Creator tooling independently generates a 16-byte random salt and 12-byte random AES-GCM nonce. It imports the recovery-code bytes as HKDF input key material and derives a non-extractable 256-bit AES-GCM key using:

- Hash: SHA-256
- Salt: the bundle's 16 decoded salt bytes
- Info: UTF-8 `share-capsules-creator-signing-key-recovery-v1`

The encrypted plaintext is RFC 8785 canonical JSON containing exactly:

- `type: "share-capsules-creator-signing-key"`
- `version: 1`
- Creator key identifier, `Ed25519` algorithm, canonical public key, and original creation instant
- The exported PKCS #8 private key encoded as canonical unpadded base64url

AES-256-GCM uses a 128-bit authentication tag. Its additional authenticated data is the RFC 8785 canonical JSON encoding of the complete public bundle header—`type`, `version`, `key`, `kdf`, and `encryption`—with only `ciphertext` omitted. Changing the key identity, public key, creation time, KDF parameters, encryption parameters, ciphertext, or tag causes recovery to fail.

## Public bundle

The downloadable UTF-8 JSON bundle contains exactly:

```json
{
  "type": "share-capsules-creator-key-recovery",
  "version": 1,
  "key": {
    "id": "creator_<opaque-id>",
    "algorithm": "Ed25519",
    "public_key": "<32-byte unpadded-base64url>",
    "created_at": "<canonical RFC 3339 instant>"
  },
  "kdf": {
    "algorithm": "HKDF-SHA-256",
    "salt": "<16-byte unpadded-base64url>"
  },
  "encryption": {
    "algorithm": "AES-256-GCM",
    "nonce": "<12-byte unpadded-base64url>"
  },
  "ciphertext": "<authenticated ciphertext and tag>"
}
```

Unknown, missing, malformed, noncanonical, or unsupported fields fail closed. The bundle does not contain the recovery code or an unencrypted private key.

The serialized bundle is limited to 16,384 UTF-8 bytes, authenticated ciphertext to 4,096 decoded bytes, and protected PKCS #8 value to 512 decoded bytes. Implementations enforce these bounds before expensive cryptographic processing where possible.

## Restoration and publication gate

After authenticated decryption, tooling strictly validates the protected plaintext and requires every duplicated public binding to equal the authenticated header. It imports the PKCS #8 Ed25519 private key and proves that it matches the declared public key by signing and verifying the fixed UTF-8 challenge `share-capsules-creator-signing-key-recovery-match-v1`.

A restored record becomes the sole active local key and is recovery-confirmed because successful restoration demonstrates possession of both recovery items. A newly generated key remains `recovery required` until the creator explicitly confirms saving the downloaded encrypted bundle and the recovery code separately. Capsule publication must obtain its signing key through the recovery-confirmed publication gate; an ordinary active-key lookup is insufficient.

Recovery codes, unencrypted PKCS #8 bytes, and derived keys never enter Laravel, Host pages, logs, analytics, URLs, or ordinary network requests. Implementations overwrite temporary JavaScript byte arrays on a best-effort basis after use while recognizing that garbage-collected runtimes do not provide a perfect memory-erasure guarantee.

## Related documents

- [Key management](../../03_architecture/key-management.md)
- [V1 cryptographic suite](../../07_security-and-privacy/cryptographic-suite-v1.md)
- [Capsule Manifest Signature V1](manifest-signature-v1.md)
