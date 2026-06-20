# Capsule Manifest V1

Status: Experimental normative contract
Last updated: 2026-06-20

## Scope

This specification defines the signed `manifest.json` structure and archive entry-name contract for Capsule format `1.0`. Cryptographic byte operations, CTX policy semantics, and the static-image content profile receive separate V1 specifications.

The machine-readable schema is [`capsule-manifest-v1.schema.json`](../../../../code/packages/capsule-core/src/schema/capsule-manifest-v1.schema.json).

## Version and identity

- `type` MUST equal `capsule-manifest`.
- `format_version` MUST equal `1.0`.
- `cryptographic_suite` MUST equal `ctx-capsule-v1`.
- `capsule.id` MUST be a lowercase UUIDv4 URN generated independently for this signed revision.
- `capsule.revision` MUST be a positive integer. An initial Capsule has revision `1` and no predecessor.
- A later revision MUST identify a different predecessor Capsule ID, a lower predecessor revision, and the predecessor's canonical manifest SHA-256 value.
- `capsule.created_at` MUST be an RFC 3339 date-time. It is descriptive signed metadata, not authorization time.

Changing protected content or policy creates a new Capsule ID. Capsule IDs are random identifiers, not hashes of plaintext or circular hashes of their own manifest.

## Payload identifiers and paths

A V1 payload identifier:

- MUST contain 1–64 ASCII characters.
- MUST begin with `a`–`z`.
- MAY contain lowercase letters and digits in hyphen-separated segments.
- MUST match `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$` exactly.

The encrypted entry path MUST be derived as `payloads/<payload-id>.enc`. It is not an arbitrary path supplied by a creator or Host. The manifest ID, declared path, and actual case-sensitive ZIP entry name MUST agree.

Format `1.0` contains exactly one payload. The plural list is retained so a future version can add multi-resource profiles without replacing the manifest shape.

## Archive allowlist

A V1 archive contains exactly these case-sensitive file entries:

```text
manifest.json
manifest.sig
payloads/<payload-id>.enc
```

Directory entries are not required and are not accepted as separate allowlisted entries. A reader MUST reject duplicate names, missing required entries, undeclared entries, absolute paths, path traversal, alternate separators, symbolic links, ZIP-level encryption, and unsupported ZIP features. A reader MUST process entries as bounded data and MUST NOT extract the archive into the host filesystem.

ZIP timestamps, entry order, compression choices allowed by the package reader, and other incidental container bytes are outside the signature. The canonical manifest and its signed entry commitments provide identity and integrity.

## Structural validation

The JSON Schema is necessary but not sufficient. After schema validation, an implementation MUST also verify:

- The payload path equals the value derived from its payload ID.
- AES-GCM ciphertext size equals plaintext size plus the 16-byte authentication tag for the V1 whole-payload representation.
- Static-image `pixel_count` equals `width * height`.
- A predecessor is different from the current Capsule and has a lower revision.
- Revision `1` is used when no predecessor exists.
- The actual archive names exactly equal the derived allowlist.

Unknown top-level or defined nested manifest fields fail closed. The `policy` object MUST satisfy the separate [CTX Embedded Policy V1](../ctx/policy-v1.md) contract before authorization. No network request carrying credentials or device proof may occur before complete manifest, signature, suite, content-profile, and policy validation.

The CTX issuer and key-broker identities MUST be absolute HTTPS URLs without user information, a query, or a fragment. They are identities used for validated discovery, not endpoints to which the Viewer blindly sends credentials. Discovery and live-message rules are defined by [CTX Protocol Contracts V1](../ctx/protocol-contracts-v1.md).

## Encodings

Binary values in the manifest use unpadded base64url. SHA-256 and Ed25519 public-key values therefore contain exactly 43 characters; the 96-bit AES-GCM nonce contains exactly 16 characters. Opaque key and release identifiers contain only ASCII letters, digits, `_`, or `-` and are 16–128 characters.

`manifest.json` MUST be valid UTF-8 Internet JSON and is signed using its RFC 8785 canonical representation. `manifest.sig` contains exactly the raw 64-byte Ed25519 signature defined by [Capsule Manifest Signature V1](manifest-signature-v1.md).

## Compatibility

A format `1.0` reader MUST reject any other `format_version`, unknown required field, unsupported profile, or unsupported suite. Future compatible behavior requires an explicit versioned specification; readers do not infer compatibility from a shared major number.

## Related documents

- [Capsule design intent](../../04_capsule/design-intent.md)
- [Capsule Cryptographic Suite V1](cryptographic-suite-v1.md)
- [Capsule Manifest Signature V1](manifest-signature-v1.md)
- [Capsule Payload Encryption V1](payload-encryption-v1.md)
- [Capsule Entry Commitments V1](entry-commitments-v1.md)
- [Static Image Content Profile V1](static-image-profile-v1.md)
- [CTX Embedded Policy V1](../ctx/policy-v1.md)
- [CTX Protocol Contracts V1](../ctx/protocol-contracts-v1.md)
- [V1 cryptographic design intent](../../07_security-and-privacy/cryptographic-suite-v1.md)
- [CTX policy model](../../05_ctx/policy-model.md)
- [Viewer content profiles](../../06_viewer/content-profiles.md)
