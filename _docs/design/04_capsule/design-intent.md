# Capsule Design Intent

Status: Draft
Last updated: 2026-06-20

## Purpose

Capture the intended role and boundaries of the Capsule package before defining a normative file format.

## Intent

A Capsule is a portable package that lets protected content and creator access intent travel together. It can be freely stored, copied, mirrored, and distributed without treating possession as authorization.

Capsule is media-agnostic. Its protected payload is arbitrary binary content and may represent an image, text, audio, video, document, archive, or a future media type. The base format must not define image-specific semantics or impose an image-oriented size ceiling. Viewer implementations may declare narrower rendering profiles without narrowing what a Capsule can protect.

Initial product priorities include images, text and HTML, PDF, word-processing documents, and spreadsheets. Capsule records the payload media type, but media type alone never grants permission to execute active content. Safe rendering behavior belongs to a versioned Viewer content profile.

The signed manifest identifies the required content-profile identifier and version. This is a request for a trusted Viewer capability, not a mechanism for embedding executable code. V1 implements only an image profile; future profiles extend Viewer capability while preserving the generic Capsule container.

A future Capsule format is expected to support:

- Public metadata
- One or more encrypted payloads
- Creator identity or public-key information
- Creator signature
- Embedded access policy
- CTX service and trust-provider configuration
- Capsule format version, Capsule revision, and cryptographic-suite identifier

## V1 package representation

A V1 Capsule is a ZIP-based `.capsule` file with a small, fixed logical layout:

```text
manifest.json
manifest.sig
payloads/
└── <payload-id>.enc
```

`manifest.json` is UTF-8 JSON constrained to the Internet JSON subset and serialized for signing with the JSON Canonicalization Scheme defined by RFC 8785. `manifest.sig` is a detached creator signature over those canonical manifest bytes. The manifest contains a payload list and describes each entry with at least a payload identifier, media type, plaintext byte length, encrypted path, and cryptographic integrity information.

V1 accepts exactly one protected image payload, but it uses the ID-addressed payload list and `payloads/` path from the beginning. Future content profiles may define multiple resources without replacing the base package layout or ambiguous fixed filenames.

Payload IDs use a restricted specification-defined ASCII form, and the entry path is derived from the ID rather than accepted as an arbitrary filesystem path. The manifest ID, declared entry path, and actual ZIP entry must agree exactly.

Optional signed descriptive metadata may include a title, description, display name, original filename, character encoding, media dimensions, duration, or codec information. Such fields are hints for presentation and must be validated rather than trusted. Original filenames are optional because they may reveal private creator information.

V1 includes no preview bytes or other public attachment inside the Capsule. Public preview and fallback presentation live between the Host page's `<capsule-viewer>` tags. That Host content is intentionally public and untrusted; the Viewer uses signed manifest metadata when it needs to identify the verified creator or content before authorization.

The ZIP container's timestamps, entry order, and other incidental encoding details are not signed and do not affect Capsule identity or signature validity. Security comes from the canonical signed manifest and its entry hashes, not from reproducing identical ZIP bytes.

V1 accepts only the defined entries, stored without ZIP-level encryption. Viewers must reject duplicate names, absolute or traversing paths, symbolic links, unsupported compression or ZIP features, entries exceeding declared limits, undeclared entries, missing entries, and any size or hash mismatch. Implementations should read entries as data rather than extract them into the host filesystem.

V1 encrypts and decrypts the one `payloads/<payload-id>.enc` entry as one complete authenticated payload. Authenticated chunking is deliberately deferred until large or streamable content makes it necessary. The manifest identifies the encryption representation so future versions can add a chunked mode without ambiguity. See [Chunking and large payloads](chunking-and-large-payloads.md).

V1 also packages one rendition and downloads the complete Capsule before decryption. Future adaptive rendition support may let a Viewer inspect signed metadata, choose among creator-provided representations locally, and range-fetch only the selected encrypted entry. See [Adaptive renditions and device capability](adaptive-renditions.md).

## Signing and encryption

Every Capsule should be creator-signed. Signing establishes package authenticity and protects metadata and policy integrity.

In V1, the complete access policy is embedded in the Capsule manifest and covered by the creator signature. The policy applies only to that Capsule. The manifest may identify CTX and key-release services needed to evaluate and fulfill the policy, but those service locations are not substitutes for the policy itself.

The embedded policy is a versioned structured JSON object using stable CTX predicate identifiers. It contains no executable code or mutable remote policy reference. Its RFC 8785 canonical SHA-256 digest is bound into authorization and key-release messages. See [CTX policy model](../05_ctx/policy-model.md).

The embedded policy is immutable within a signed Capsule revision. Changing protected content or policy produces a newly signed revision and a new Capsule identifier that the creator republishes. A CTX Provider may suspend or revoke future access for security or abuse response, but it must never remotely loosen the requirements in the signed policy.

## Versioning and compatibility

Every Capsule manifest includes explicit, signed version information:

- **Capsule format version** identifies how the package and manifest are parsed. It allows a Viewer to select compatible behavior and reject unsupported versions safely.
- **Capsule revision** identifies a creator-issued update within the same logical Capsule lineage.
- **Cryptographic-suite identifier** selects the defined algorithms and parameters without treating an algorithm change as an ordinary content revision.

Format V1 uses the exact format version string `1.0`, a positive integer revision, a random lowercase UUIDv4 URN for each signed Capsule revision, and the suite identifier `ctx-capsule-v1`. An initial Capsule has revision `1`; a later revision may identify a different predecessor Capsule, lower predecessor revision, and predecessor manifest hash. Unknown versions and fields fail closed rather than receiving inferred compatibility. See [Capsule Manifest V1](../10_specifications/capsule/manifest-v1.md).

Protected payloads should be encrypted locally before distribution. Encryption controls access; signing does not.

Each protected payload uses a new random symmetric content-encryption key. Public-key cryptography supports creator signatures, Viewer device identity, authorization, and wrapping content keys to authorized Viewers. A single Share Capsules account key must not be reused to encrypt every Capsule.

V1 uses one named suite: AES-256-GCM for whole-payload encryption, Ed25519 for creator signatures, SHA-256 for hashing, and HPKE with X25519, HKDF-SHA-256, and AES-256-GCM for content-key delivery. Unknown or unavailable suites fail closed; V1 does not negotiate a weaker alternative. See [V1 cryptographic suite](../07_security-and-privacy/cryptographic-suite-v1.md).

Creator signing keys remain on creator-controlled devices. The manifest identifies key purposes and versions so tooling can rotate signing and release keys without asking creators to choose low-level cryptographic material during ordinary publishing.

## Portability

Capsules must not depend on a specific Host. Creator policy and authenticity must survive copying or mirroring to another compatible Host.

Service references may be necessary for live authorization, but the package format must not permanently privilege one CTX Provider.

V1 creator tooling writes the configured Share Capsules CTX issuer, accepted assertion issuer, Key Broker identity, and release handle automatically. These machine-readable distinctions preserve security and portability but are not ordinary creator configuration. Future advanced tooling may expose compatible provider selection.

## Non-goals

- Preventing all copying after rendering
- Acting as a social or publishing platform
- Requiring a Host to process trust credentials
- Treating package possession as evidence of authorization
- Embedding raw viewer reputation or personal data in the package

## Open questions

- How should a future adaptive format represent multiple protected payloads or renditions?
- How are creator keys rotated and compromised signatures handled?

## Related documents

- [System overview](../03_architecture/system-overview.md)
- [Key management](../03_architecture/key-management.md)
- [Chunking and large payloads](chunking-and-large-payloads.md)
- [Adaptive renditions and device capability](adaptive-renditions.md)
- [Viewer content profiles](../06_viewer/content-profiles.md)
- [V1 cryptographic suite](../07_security-and-privacy/cryptographic-suite-v1.md)
- [CTX design intent](../05_ctx/design-intent.md)
- [CTX policy model](../05_ctx/policy-model.md)
- [Viewer design intent](../06_viewer/design-intent.md)
