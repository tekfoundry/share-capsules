# Capsule Entry Commitments V1

Status: Experimental normative contract
Last updated: 2026-06-20

## Scope

This specification defines SHA-256 commitments for format `1.0` Capsule payload entries, canonical manifest commitments used by revision ancestry, and strict actual-versus-declared archive validation.

The reference implementation is [`entry-commitment.ts`](../../../../code/packages/capsule-core/src/entry-commitment.ts).

## Digest and encoding

V1 uses SHA-256 and requires a 32-byte digest result. Manifest digest fields contain the digest as canonical unpadded base64url, producing exactly 43 ASCII characters.

Readers MUST reject padded, non-canonical, malformed, incorrectly sized, or differently encoded digest values. They MUST NOT normalize or reinterpret a signed digest field before comparison.

## Encrypted payload commitment

`payload.ciphertext_sha256` is SHA-256 over exactly the complete bytes stored in the declared `payload.path` archive entry:

```text
SHA-256(C || T)
```

`C || T` is the whole-payload AES-256-GCM representation, including its trailing 16-byte tag. ZIP headers, ZIP compression bytes, filenames, timestamps, other container metadata, `manifest.json`, and `manifest.sig` are not part of this digest.

The manifest separately declares `ciphertext_size`. A reader MUST require both:

```text
actual entry byte length = ciphertext_size
base64url(SHA-256(actual entry bytes)) = ciphertext_sha256
```

The comparison is against the exact case-sensitive signed strings. A same-length substituted or modified entry therefore fails its digest commitment, while a truncated or extended entry fails its length declaration before further processing.

## Canonical manifest commitment

`capsule.predecessor.manifest_sha256` is SHA-256 over exactly the RFC 8785 canonical UTF-8 bytes of the predecessor's complete validated `manifest.json` value. It is encoded as canonical unpadded base64url.

It does not hash the predecessor's original JSON serialization, `manifest.sig`, ZIP metadata, or complete archive. Object insertion order and insignificant JSON whitespace therefore do not alter the commitment, while any signed semantic value does.

The predecessor commitment supplements revision linkage. It does not replace verification of the predecessor's creator signature when that artifact is used as trusted evidence.

## Archive-level validation

Before accepting entry commitments, a V1 reader MUST:

1. Preflight bounded archive metadata and reject duplicate, absolute, traversing, alternatively separated, or otherwise unsupported names and features before processing entry bodies.
2. Locate the exact `manifest.json` and `manifest.sig` entries and parse the bounded manifest under the V1 manifest and I-JSON contracts.
3. Verify the creator signature and selected cryptographic suite.
4. Derive the complete exact archive allowlist from the validated payload ID and reject any missing or undeclared entry.
5. Locate the one exact case-sensitive encrypted payload entry.
6. Compare its actual byte length with signed `ciphertext_size`.
7. Compute SHA-256 over its actual stored entry data and compare the canonical base64url result with signed `ciphertext_sha256`.

Archive validation MUST operate on bounded entry data without filesystem extraction. Complete manifest, signature, policy, suite, profile, entry-name, length, and digest validation MUST succeed before authenticated CTX traffic, key release, payload decryption, or rendering.

`manifest.json` is authenticated by its creator signature rather than by a self-referential digest. `manifest.sig` is validated by its exact representation and Ed25519 verification rather than by a manifest hash field.

## Failure behavior

Length mismatch, digest mismatch, missing entries, duplicate entries, undeclared entries, invalid digest encoding, and unavailable SHA-256 support are closed failures. Errors returned outside trusted tooling MUST be structured and MUST NOT contain entry bytes, plaintext, keys, or other secret material.

## Executable contract

Automated tests lock down:

- The FIPS 180-4 SHA-256 `abc` vector and canonical base64url result
- Successful validation only when actual length and digest both match
- Failure after truncation, extension, or any same-length byte change
- Exact missing, duplicate, and undeclared archive-entry rejection
- Canonical manifest hashes independent of object insertion order
- Manifest commitment changes after any signed value changes
- Exact hashing of canonical predecessor-manifest bytes
- Canonical base64url enforcement for hashes, creator public keys, and nonces
- Structured payload-mismatch and digest-provider failures that do not retain entry content or provider details

Reference tests are in [`entry-commitment-v1.test.ts`](../../../../code/packages/test-fixtures/src/capsule/entry-commitment-v1.test.ts).

## Related specifications

- [Capsule Manifest V1](manifest-v1.md)
- [Capsule Manifest Signature V1](manifest-signature-v1.md)
- [Capsule Payload Encryption V1](payload-encryption-v1.md)

## Standards references

- [FIPS 180-4: Secure Hash Standard](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)
- [RFC 4648: Base Encodings](https://www.rfc-editor.org/rfc/rfc4648)
- [RFC 8785: JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
