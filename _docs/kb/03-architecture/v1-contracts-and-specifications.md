# V1 Contracts And Specifications

Status: Current experimental contracts
Last updated: 2026-08-26

## Purpose

This page carries the durable V1 contract facts now maintained under the
architecture knowledge-base area. The contracts remain experimental until
independent interoperability and public conformance criteria are demonstrated.

## Capsule Manifest V1

The V1 `.capsule` file is ZIP-based and has a fixed logical layout:

```text
manifest.json
manifest.sig
payloads/<payload-id>.enc
```

Format V1 uses:

- format version `1.0`;
- one positive integer revision;
- random lowercase UUIDv4 URN Capsule identifiers;
- restricted ASCII payload identifiers;
- exactly one encrypted static-image payload;
- explicit CTX issuer, broker, release handle, content profile, policy,
  policy digest, suite, entry path, sizes, and commitments;
- a detached creator signature over RFC 8785 canonical manifest bytes.

Viewers reject duplicate entries, absolute paths, traversal paths, undeclared
entries, missing entries, unsupported ZIP features, mismatched declared and
actual paths, and size/hash mismatches.

## Cryptographic Suite V1

The only accepted suite identifier is:

```text
ctx-capsule-v1
```

It selects the complete primitive set:

| Purpose | Primitive |
| --- | --- |
| Creator manifest signature | Ed25519 |
| Entry and identifier digest | SHA-256 |
| Payload encryption | AES-256-GCM with a 32-byte key, 12-byte nonce, 16-byte tag |
| Content-key delivery | HPKE base mode |
| HPKE KEM | DHKEM(X25519, HKDF-SHA256) |
| HPKE KDF | HKDF-SHA256 |
| HPKE AEAD | AES-256-GCM |

The suite is not negotiated. Missing, malformed, downgraded, future, or
differently cased suite identifiers fail closed.

## Payload Encryption V1

Each protected payload uses a fresh 256-bit content key and 96-bit nonce. The
payload is encrypted as one complete AES-256-GCM operation. Ciphertext is stored
as ciphertext followed by the 16-byte tag. Additional authenticated data binds
the encryption to the exact Capsule, revision, payload, policy digest,
content-profile, and suite context.

Whole-payload encryption is the only V1 representation. Chunking and streaming
remain deferred.

## Entry Commitments V1

The manifest commits to the exact encrypted entry byte length and SHA-256
digest. Validation compares actual archive entries against signed declarations
before authorization or decryption. Commitment failures are not warnings.

## Static Image Profile V1

The profile identifier/version is implemented by the shared content-profile
registry and extension creator/viewer adapters. It accepts only static JPEG,
PNG, and WebP, validates actual bytes rather than extensions, and enforces the
envelope recorded in [V1 requirements](../02-requirements/v1-requirements.md).

Creator validation and Viewer validation use shared contracts so accepted
creator input and actual rendering behavior do not drift.

## CTX Embedded Policy V1

The policy is structured JSON using one `all` combiner. Mandatory requirements
cover verified account, active account, registered Viewer device, and explicit
view-event consent. Optional requirements cover opening/closing instants,
Capsule-global lifetime limit, account-and-Capsule lifetime limit, and current
ecosystem automation-risk-not-high.

The canonical policy digest is computed with RFC 8785 and SHA-256. The digest
is bound into authorization and key-release messages.

## CTX Protocol Contracts V1

Provider and broker metadata are derived from configured issuers and expose
closed-world V1 capabilities. The authorization ticket is a compact Ed25519 JWS
with type `ctx-key-release+jwt`, exact issuer, broker audience, unique `jti`,
60-second lifetime, Capsule/revision/payload/action/suite/policy bindings,
release handle, and Viewer proof/agreement key bindings. It carries no public
global account identifier.

The broker release proof is a fresh `ctx-key-release-proof+jwt` device proof
bound to method, endpoint, creation time, unique identifier, and the exact
ticket hash. The broker returns HPKE output only after successful online
redemption.

Errors use a privacy-safe envelope with reviewed codes and retryability. The
Host must not receive raw protocol error bodies.

## Creator Signing-Key Recovery V1

Creator tooling generates a 32-byte recovery code encoded as unpadded
base64url. It derives an AES-256-GCM key with HKDF-SHA-256, a random salt, and
a fixed context string to encrypt a canonical JSON bundle containing the
creator Ed25519 signing private key and matching public bindings.

The recovery bundle does not include the recovery code or plaintext private
key. Publication must go through a recovery-confirmed signing-key gate.

## Fixtures And Vectors

The contract fixture catalog lives under
`code/packages/test-fixtures/src/fixtures/` and covers valid, malformed,
tampered, oversized, downgraded, and unsupported cases. Cryptographic vectors
under `code/packages/test-fixtures/src/vectors/` publish exact canonical JSON,
policy digest, manifest digest, Ed25519 signatures, AES-GCM outputs, CTX ticket
bytes, HPKE context bytes, and project HPKE outputs.

The test vector private keys and nonces are test-only material and must never
escape test or fixture contexts.

## Implementation Evidence

- `code/packages/capsule-core/src`
- `code/packages/ctx-client/src`
- `code/packages/capsule-creator/src`
- `code/packages/test-fixtures/src`
- `code/tests/Unit/CryptographicVectorsV1Test.php`
- `code/packages/test-fixtures/src/**/*.test.ts`

## Migration Coverage

Detailed legacy-to-KB provenance is tracked in the
[migration inventory](../migration-inventory.md). Contract-specific durable
facts now live in this page and under
[specifications](specifications/README.md).
