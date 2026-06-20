# V1 Cryptographic Suite

Status: Accepted
Last updated: 2026-06-20

## Purpose

Define the selected cryptographic building blocks and downgrade boundaries for the V1 Capsule and Share Capsules reference implementation.

This document captures design intent. The exact suite identifier, primitive mapping, parameters, and downgrade behavior are defined by the [Capsule Cryptographic Suite V1 specification](../10_specifications/capsule/cryptographic-suite-v1.md). Canonical manifest bytes, creator-key binding, and the detached signature are defined by [Capsule Manifest Signature V1](../10_specifications/capsule/manifest-signature-v1.md). Other operation-specific byte encodings, labels, and test vectors belong in their respective normative specifications.

## One named suite

V1 supports exactly one named cryptographic suite. Every signed Capsule manifest identifies that suite. Creators, Viewers, the CTX service, and the key broker must reject an unknown, unavailable, malformed, or mismatched suite rather than negotiate or silently substitute algorithms.

Future suites receive new identifiers and explicit compatibility rules. Supporting an older Capsule is a deliberate implementation capability, not an automatic downgrade path during creation or authorization.

## Selected primitives

| Purpose | V1 primitive |
|---|---|
| Protected-payload encryption | AES-256-GCM |
| Creator manifest signature | Ed25519 |
| Viewer device and OAuth proof | Ed25519 using a separate device key |
| CTX authorization-ticket signature | Ed25519 using a separate provider key |
| Capsule entry and identifier hashing | SHA-256 |
| Content-key delivery to a Viewer device | HPKE using X25519, HKDF-SHA-256, and AES-256-GCM |

## Payload encryption

Every protected payload receives a new random 256-bit content key. V1 whole-payload encryption uses AES-256-GCM with a fresh 96-bit nonce and a 128-bit authentication tag.

The nonce is generated randomly for the one encryption performed with that content key and stored as signed manifest metadata. Authenticated additional data binds the ciphertext to its Capsule, suite, profile, and payload context through the exact versioned object defined by [Capsule Payload Encryption V1](../10_specifications/capsule/payload-encryption-v1.md).

A content-key and nonce combination must never be reused. Authentication failure causes the Viewer to stop without rendering partial plaintext.

## Creator signatures

The creator signs the RFC 8785 canonical UTF-8 bytes of `manifest.json` using Ed25519. `manifest.sig` carries the raw 64-byte detached signature.

The manifest identifies the signing key and suite. Verification must complete before policy presentation, authorization, key release, or payload decryption. Signature keys are used only for signatures and never for key agreement or encryption.

## Hashing

SHA-256 commits the signed manifest to declared package entries and supports canonical predecessor-manifest commitments under [Capsule Entry Commitments V1](../10_specifications/capsule/entry-commitments-v1.md).

Hashes detect package mismatch and support stable identification; they do not replace the creator signature or AES-GCM authentication.

## Content-key delivery

The key broker encrypts the authorized content key to the registered Viewer device public key using standardized HPKE with:

- X25519 key encapsulation
- HKDF-SHA-256 key derivation
- AES-256-GCM authenticated encryption

V1 uses HPKE base mode because authorization, broker identity, and request integrity are established separately through TLS, signed authorization, and the registered device-key relationship. HPKE context information and authenticated additional data bind the result to the Capsule, payload, release handle, Viewer agreement key, exact signed authorization ticket, and protocol purpose so a wrapped key cannot be replayed in another context. The exact bytes are defined by [CTX Protocol Contracts V1](../10_specifications/ctx/protocol-contracts-v1.md).

The Viewer X25519 agreement private key remains non-exportable where the browser platform permits. HPKE must use an established, reviewed implementation or correctly composed platform primitives; the project must not invent a custom public-key wrapping scheme.

The Viewer uses a separate Ed25519 proof key for signed challenges and sender-constrained OAuth requests. Proof and agreement keys are registered and revoked as one device-key set but are never reused across purposes.

## Recovery bundles

Creator signing-key recovery bundles use authenticated encryption and a key derived from the separately generated high-entropy recovery code. Account passwords are not cryptographic inputs. Exact recovery-bundle derivation and encoding remain separate specification work and require dedicated test vectors.

## Implementation requirements

- Perform runtime capability detection before creation or authorization.
- Fail closed before key release when the required suite is unavailable.
- Use platform cryptography or carefully reviewed libraries.
- Keep signing, device agreement, content, recovery, and authorization keys separate.
- Use explicit domain-separation labels for every derivation and authenticated context.
- Validate public keys and reject malformed or all-zero agreement results as required by the underlying standards.
- Do not log private keys, content keys, recovery codes, plaintext, or raw shared secrets.
- Publish deterministic cross-implementation test vectors for canonicalization, signatures, hashes, payload encryption, and HPKE delivery.
- Treat Web Crypto support and library behavior as release-tested dependencies of the Chromium Viewer profile.

## Standards references

- [Web Cryptography Level 2](https://www.w3.org/TR/webcrypto-2/)
- [RFC 8032: Edwards-Curve Digital Signature Algorithm](https://www.rfc-editor.org/rfc/rfc8032)
- [RFC 8785: JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
- [RFC 9180: Hybrid Public Key Encryption](https://www.rfc-editor.org/rfc/rfc9180)

## Related documents

- [Capsule design intent](../04_capsule/design-intent.md)
- [Key management](../03_architecture/key-management.md)
- [Share Capsules reference implementation](../03_architecture/share-capsules-reference-implementation.md)
- [Browser Viewer](../06_viewer/browser-viewer.md)
- [CTX authorization and key release](../05_ctx/authorization-and-key-release.md)
