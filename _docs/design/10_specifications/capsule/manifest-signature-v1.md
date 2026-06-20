# Capsule Manifest Signature V1

Status: Experimental normative contract
Last updated: 2026-06-20

## Scope

This specification defines the RFC 8785 canonicalization and detached Ed25519 signature used by format `1.0` Capsules with cryptographic suite `ctx-capsule-v1`.

The reference implementation is split into [`canonical-json.ts`](../../../../code/packages/capsule-core/src/canonical-json.ts) and [`manifest-signature.ts`](../../../../code/packages/capsule-core/src/manifest-signature.ts). Canonicalization is backed by the reviewed, browser-compatible `canonicalize` implementation and protected by a Share Capsules I-JSON validation boundary.

## Signed content

`manifest.sig` is the Ed25519 signature over exactly the RFC 8785 canonical UTF-8 bytes of the complete `manifest.json` value. No whitespace, byte-order mark, archive metadata, signature prefix, or original JSON serialization is included.

The complete manifest includes its `type`, `format_version`, `cryptographic_suite`, creator signing-key identity and public key, policy, provider references, payload declarations, and entry commitments. Those signed fields bind the signature to the Capsule manifest purpose and selected suite.

`manifest.sig` contains the raw 64 signature bytes. It is not JSON, hexadecimal, PEM, DER, base64, or base64url text.

## Canonical JSON input

Before canonicalization, the manifest MUST pass the format `1.0` JSON Schema and all structural validation. It MUST also satisfy the I-JSON input constraints required by RFC 8785.

The reader and creator tooling MUST reject:

- Non-finite numbers
- Lone Unicode surrogates in property names or string values
- Duplicate object property names in the decoded `manifest.json` input
- Values that are not JSON null, booleans, numbers, strings, arrays, or objects
- Sparse arrays, cyclic data, accessors, symbol properties, and non-plain JavaScript objects when an in-memory API is used
- Input exceeding accepted resource and nesting limits

The Share Capsules reference implementation permits at most 64 nested array or object levels at its canonicalization boundary. Valid V1 manifests are expected to remain well below that limit.

An in-memory JavaScript object cannot reveal duplicate names that were already discarded by a permissive parser. The future Capsule byte reader MUST therefore reject duplicate object names while decoding `manifest.json`, before it calls the canonicalization API.

## RFC 8785 serialization

Canonicalization MUST follow RFC 8785, including:

- No insignificant whitespace
- ECMAScript JSON primitive and IEEE 754 number serialization
- Lowercase hexadecimal control-character escapes
- Recursive object-property sorting by raw UTF-16 code units
- Preservation of array element order
- UTF-8 encoding of the final canonical string without a byte-order mark

Implementations MUST NOT use locale-sensitive sorting or sign the original archive bytes merely because a particular producer emitted them deterministically.

## Creator key binding and signing

The creator signing key is Ed25519. Its public key is the raw 32-byte Ed25519 public key encoded as canonical unpadded base64url in `manifest.creator.signing_key.public_key`.

Creator tooling MUST:

1. Construct the complete manifest, including the creator public key and suite.
2. Validate the manifest and I-JSON input.
3. Confirm that the public half of the signing key pair exactly matches the public key declared by the manifest.
4. Canonicalize the manifest through RFC 8785 and encode it as UTF-8.
5. Sign those bytes with the matching Ed25519 private key.
6. Immediately verify the result against the declared public key, proving that the supplied private and public keys form a pair.
7. Require a raw 64-byte result and store it as `manifest.sig`.

The public key is exportable because it must be published and compared with the manifest. The private key SHOULD be non-exportable during ordinary use where the platform supports that property. Key recovery uses the separately specified encrypted recovery mechanism rather than routine raw-private-key export.

Signing MUST fail if the key type, algorithm, usage, public-key length, signature length, or manifest key binding is wrong.

## Verification

A Viewer MUST:

1. Validate the manifest structure, format, suite, and I-JSON input.
2. Decode the manifest's public key using strict canonical unpadded base64url rules.
3. Require exactly 32 public-key bytes and import them as an Ed25519 verification key.
4. Require exactly 64 raw signature bytes.
5. Reproduce the RFC 8785 canonical UTF-8 manifest bytes.
6. Verify `manifest.sig` against those bytes and the public key declared inside the manifest.

Verification failure MUST stop processing before policy presentation, authenticated CTX traffic, key release, payload decryption, or rendering. The Viewer MUST NOT accept a caller-supplied replacement public key or try a different suite, signature algorithm, serialization, or normalized manifest.

## Executable contract

Automated tests lock down:

- RFC 8785 recursive ordering, UTF-16 property sorting, primitive serialization, and exact UTF-8 bytes
- Rejection of non-I-JSON values, lone surrogates, sparse arrays, cycles, accessors, symbols, non-plain objects, and excessive nesting
- The RFC 8032 Ed25519 empty-message test vector
- Raw 32-byte public-key and 64-byte detached-signature requirements
- Canonical unpadded base64url public-key encoding
- Equivalent signatures across object insertion order
- Failure after any signed manifest value changes
- Failure for a different signer, mixed or mismatched key pair, mismatched manifest key, invalid manifest, wrong key role, and truncated or extended signature

Reference tests are in [`canonical-json.test.ts`](../../../../code/packages/test-fixtures/src/capsule/canonical-json.test.ts) and [`manifest-signature-v1.test.ts`](../../../../code/packages/test-fixtures/src/capsule/manifest-signature-v1.test.ts).

## Related specifications

- [Capsule Manifest V1](manifest-v1.md)
- [Capsule Cryptographic Suite V1](cryptographic-suite-v1.md)

## Standards references

- [RFC 7493: The I-JSON Message Format](https://www.rfc-editor.org/rfc/rfc7493)
- [RFC 8032: Edwards-Curve Digital Signature Algorithm](https://www.rfc-editor.org/rfc/rfc8032)
- [RFC 8785: JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
