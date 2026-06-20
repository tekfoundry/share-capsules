# Capsule Payload Encryption V1

Status: Experimental normative contract
Last updated: 2026-06-20

## Scope

This specification defines whole-payload AES-256-GCM encryption for format `1.0` Capsules using cryptographic suite `ctx-capsule-v1`.

The reference implementation is [`payload-encryption.ts`](../../../../code/packages/capsule-core/src/payload-encryption.ts).

## Key, nonce, and tag

Each protected payload MUST use:

- A newly generated 32-byte content key
- A newly generated 12-byte nonce
- AES-GCM with a 128-bit authentication tag
- The canonical authenticated context defined below

Creator tooling MUST obtain key and nonce bytes from a cryptographically secure random source. A content-key and nonce combination MUST NOT be reused. V1 generates a new content key as well as a new nonce for every encryption rather than relying on nonce coordination across payloads.

The raw content key and nonce exist only within trusted creator or Viewer tooling for the time needed to perform their accepted operations. They MUST NOT enter ordinary Laravel paths, Host-page JavaScript, logs, analytics, or error details.

## Ciphertext representation

The encrypted payload entry contains the Web Cryptography AES-GCM result:

```text
C || T
```

`C` is the ciphertext with the same byte length as the plaintext. `T` is the trailing 16-byte authentication tag. The tag is not stored in a separate manifest field or archive entry.

Consequently:

```text
ciphertext_size = plaintext_size + 16
```

V1 performs one whole-payload authenticated-encryption operation. It does not split, stream, or independently authenticate chunks.

## Authenticated context

The AES-GCM additional authenticated data is the RFC 8785 canonical UTF-8 encoding of this exact object:

```json
{
  "type": "ctx-capsule-payload-aad",
  "version": "1.0",
  "cryptographic_suite": "ctx-capsule-v1",
  "capsule": {
    "id": "<signed Capsule ID>",
    "revision": 1
  },
  "content_profile": {
    "id": "ctx.content.static-image",
    "version": "1.0"
  },
  "payload": {
    "id": "<signed payload ID>",
    "path": "<derived encrypted entry path>",
    "media_type": "<signed media type>",
    "plaintext_size": 1
  }
}
```

The example values in angle brackets and numeric examples are replaced by the corresponding signed manifest values. The property set, spelling, capitalization, and string versions are fixed for AAD version `1.0`. RFC 8785 determines property order in the resulting bytes.

The AAD binds ciphertext to:

- The Capsule identity and revision
- The selected cryptographic suite
- The content-profile identity and version
- The payload identity and derived archive path
- The declared media type and plaintext length
- The Capsule payload-encryption purpose and AAD version

Changing any bound value causes authentication failure.

The AAD deliberately excludes `ciphertext_sha256` and `ciphertext_size`; including ciphertext-derived values would create a circular construction. It also excludes CTX issuer, broker location, release handle, policy, and descriptive metadata. Those values remain creator-signed in the manifest, while excluding them from payload encryption avoids unnecessary provider coupling and permits non-content metadata evolution through an explicitly signed Capsule revision. Changing protected content or policy still creates a new Capsule ID under the manifest contract.

## Encryption procedure

Creator tooling MUST:

1. Generate a fresh 32-byte content key and 12-byte nonce.
2. Construct and validate the V1 manifest fields needed by the authenticated context.
3. Confirm that the actual plaintext length equals `payload.plaintext_size`.
4. Construct and RFC 8785-canonicalize the exact AAD object.
5. Encrypt the complete plaintext once with AES-256-GCM, the fresh nonce, the AAD, and a 128-bit tag.
6. Confirm that the result is exactly `plaintext_size + 16` bytes.
7. Compute the ciphertext commitment, finish the manifest, and sign it in the later packaging steps.

The raw content key is registered with the selected broker through the separately specified trusted flow. It is never placed inside the Capsule.

## Decryption procedure

Trusted Viewer tooling MUST:

1. Complete manifest, suite, signature, policy, and entry validation required before decryption.
2. Obtain the authorized 32-byte content key through the accepted key-release flow.
3. Strictly decode the signed 12-byte nonce.
4. Require the encrypted entry length to equal signed `plaintext_size + 16`.
5. Reconstruct the exact AAD from the validated signed manifest.
6. Perform one AES-256-GCM authenticated decryption.
7. Require the resulting plaintext length to equal signed `plaintext_size` before profile processing.

Authentication failure, wrong key, wrong nonce, altered AAD, altered ciphertext, altered tag, or length mismatch MUST return no plaintext and stop rendering. Errors exposed outside trusted tooling MUST be structured and MUST NOT include key, nonce, plaintext, or decrypted fragments.

## Executable contract

Automated tests lock down:

- The exact canonical AAD bytes and immutable context
- The NIST AES-256-GCM empty-plaintext and empty-AAD vector
- 32-byte keys, 12-byte nonces, and trailing 16-byte tags
- Whole-payload round trips and declared length enforcement
- Authentication of every AAD field
- Failure after ciphertext, tag, key, nonce, or AAD changes
- Rejection of invalid key, nonce, plaintext, and ciphertext lengths
- Fresh buffer creation through an injectable secure-random boundary
- Structured, non-secret-bearing failures

Reference tests are in [`payload-encryption-v1.test.ts`](../../../../code/packages/test-fixtures/src/capsule/payload-encryption-v1.test.ts).

## Related specifications

- [Capsule Manifest V1](manifest-v1.md)
- [Capsule Cryptographic Suite V1](cryptographic-suite-v1.md)
- [Capsule Manifest Signature V1](manifest-signature-v1.md)

## Standards references

- [NIST SP 800-38D: Galois/Counter Mode](https://csrc.nist.gov/pubs/sp/800/38/d/final)
- [Web Cryptography Level 2: AES-GCM](https://www.w3.org/TR/webcrypto-2/#aes-gcm)
- [RFC 8785: JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
