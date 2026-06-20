# Cryptographic and Canonicalization Vectors V1

Status: Experimental normative vectors
Last updated: 2026-06-20

## Purpose

The [V1 vector set](../../../../code/packages/test-fixtures/src/vectors/cryptographic-vectors-v1.json) publishes exact language-neutral inputs and outputs for Capsule and CTX byte operations. Implementations MUST reproduce every applicable output before claiming compatibility with the experimental V1 contracts.

The vector file contains private keys, fixed nonces, and deterministic ephemeral material solely for testing. Its root warning is mandatory:

```text
TEST-ONLY KEY MATERIAL. NEVER USE THESE KEYS OR NONCES IN PRODUCTION.
```

None of those values may be copied into runtime configuration, fixtures that escape test environments, examples presented as secure key generation, or production data.

## Covered operations

The V1 set covers:

- RFC 8785 JSON canonicalization and SHA-256
- Canonical embedded-policy bytes and digest
- Canonical Capsule manifest bytes and digest
- Detached Ed25519 manifest signing and verification
- Encrypted-entry byte recipe and SHA-256 commitment
- AES-256-GCM payload AAD, encryption, tag placement, and decryption
- Exact CTX compact-ticket header, claims, signing input, Ed25519 signature, and serialization
- CTX HPKE `info` and authenticated additional data
- HPKE base-mode X25519 recipient derivation, deterministic test encapsulation, AES-256-GCM ciphertext, and content-key opening

All hexadecimal strings use lowercase ASCII without a prefix. Protocol-facing digests use canonical unpadded base64url. `canonical_utf8`, AAD, and ticket signing inputs identify exact UTF-8 or ASCII bytes rather than prose renderings.

## Byte recipes

A `byte-sequence` recipe with `length` and `modulus` produces byte `i` as `i mod modulus`. It is used only to express deterministic public test input compactly.

## Ed25519 provenance

The Ed25519 private seed and public key are the public RFC 8032 test-case-one values. The manifest and CTX-ticket signatures are project-specific outputs over V1 canonical bytes and JWS signing input using that published test key.

An implementation verifies both stored signatures and SHOULD reproduce them from the test seed when its signing API permits deterministic Ed25519 signing. The private seed is not a creator or provider secret.

## AES-256-GCM representation

The payload vector uses a 32-byte content key, 12-byte nonce, exact canonical payload AAD, and 32-byte plaintext recipe. `ciphertext_hex` contains ciphertext followed by the 16-byte GCM authentication tag, matching Web Cryptography's returned representation and Capsule V1 length rules.

An implementation MUST reproduce the complete ciphertext-and-tag value and recover the exact plaintext. Altering the key, nonce, AAD, ciphertext, or tag must fail authentication without returning plaintext.

## CTX ticket

The vector fixes the protected-header JSON serialization and claims JSON serialization before base64url encoding. JWS does not use RFC 8785 implicitly; therefore `signing_input_ascii` is the normative byte input for this vector. The parsed header and claims must independently satisfy [CTX Protocol Contracts V1](../ctx/protocol-contracts-v1.md).

## HPKE project vector and provenance

RFC 9180 permits the V1 combination:

- Mode `0`: base mode
- KEM `0x0020`: DHKEM(X25519, HKDF-SHA-256)
- KDF `0x0001`: HKDF-SHA-256
- AEAD `0x0002`: AES-256-GCM

RFC 9180 does not publish an appendix vector for that exact combination; its X25519 appendix vectors use AES-128-GCM, ChaCha20-Poly1305, or export-only mode. The V1 HPKE case is therefore explicitly a Share Capsules project vector, not an RFC-derived output.

The vector is generated and continuously verified by the lockfile-pinned [`hpke-js`](https://github.com/dajiaji/hpke-js) implementation through `@hpke/core` and `@hpke/dhkem-x25519`. Fixed recipient and ephemeral input keying material are passed only through the library's test hook to make encapsulation deterministic. Runtime sealing omits that input and uses secure randomness.

Before a PHP broker or second independent implementation is considered interoperable, it MUST open this stored vector and reproduce its deterministic seal independently. Agreement with the same library through a second wrapper is not an independent confirmation. This requirement does not block the current contract publication, but it is a release gate for the broker implementation.

Malformed keys, an all-zero X25519 shared-secret path, wrong `info`, wrong AAD, changed encapsulation, changed ciphertext, authentication failure, and incorrect byte lengths fail closed with no content key.

## Cross-language conformance

The TypeScript suite reproduces every vector and verifies negative HPKE behavior in [`cryptographic-vectors-v1.test.ts`](../../../../code/packages/test-fixtures/src/cryptographic-vectors-v1.test.ts).

The PHP suite reads the identical JSON file in [`CryptographicVectorsV1Test.php`](../../../../code/tests/Unit/CryptographicVectorsV1Test.php) and independently:

- Hashes the published canonical bytes and entry recipe
- Verifies manifest and ticket Ed25519 signatures with Sodium
- Reproduces and opens the AES-256-GCM vector with OpenSSL

The future PHP broker HPKE adapter adds the independent HPKE assertion described above; it must not fork or rewrite the vector data.

## Related documents

- [Capsule Contract Fixtures V1](capsule-contract-fixtures-v1.md)
- [Capsule Cryptographic Suite V1](../capsule/cryptographic-suite-v1.md)
- [Capsule Manifest Signature V1](../capsule/manifest-signature-v1.md)
- [Capsule Payload Encryption V1](../capsule/payload-encryption-v1.md)
- [Capsule Entry Commitments V1](../capsule/entry-commitments-v1.md)
- [CTX Protocol Contracts V1](../ctx/protocol-contracts-v1.md)
