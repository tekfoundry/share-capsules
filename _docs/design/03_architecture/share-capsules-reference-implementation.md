# Share Capsules Reference Implementation

Status: Draft
Last updated: 2026-06-20

## Purpose

Define the intended V1 implementation boundaries for `sharecapsules.com` without turning implementation choices into requirements for every future CTX Provider.

Share Capsules presents one user-facing account and product workflow. Its CTX Provider, automation-risk Trust Provider, and Key Broker roles remain logically distinct but are selected automatically by V1 tooling rather than exposed as routine creator or viewer configuration. See [V1 creator and viewer experience](../02_product/v1-user-experience.md).

## Technology direction

The Share Capsules reference implementation uses:

- Laravel for the hosted web application, account system, and CTX control plane
- MySQL for durable application state
- Redis for queues, counters, caching, and rate limits
- A TypeScript browser extension for trusted creation and viewing
- A shared TypeScript library for Capsule and CTX client behavior
- A logically isolated key-release component
- A separately deployable static reference Host used for examples and interoperability testing

Future CTX Providers may use different technology stacks as long as they conform to the eventual Capsule, CTX, and Viewer specifications.

MySQL is an implementation choice for Share Capsules, not a CTX requirement. The V1 schema and transaction design must use supported transactional tables, foreign keys, uniqueness constraints, and row-level locking where required for atomic ticket redemption and counter enforcement. Redis may accelerate queues, caching, and service protection, but it must not weaken durable authorization invariants.

## V1 hosting boundary

Share Capsules does not provide general-purpose Capsule hosting in V1. The hosted product manages accounts, trust evidence, policy evaluation, authorization, creator metadata needed by CTX, and Viewer distribution. It does not operate a creator-content storage platform.

This avoids making storage capacity, bandwidth, moderation, takedowns, content retention, and hosting economics prerequisites for validating Capsule and CTX.

Creators export completed encrypted Capsules and publish them through a Host they control or select.

## Laravel responsibilities

Laravel provides:

- Share Capsules account registration and verified email
- Laravel Fortify password authentication and optional multi-passkey enrollment using the official Laravel passkey integration
- Account recovery workflows
- Viewer device registration and revocation
- Consent and reputation records
- Trust Provider integrations
- CTX policy evaluation
- Short-lived authorization issuance
- Signed authorization-ticket metadata, keys, and online redemption
- Usage counters and rate limits
- Audit events, background jobs, and administrative workflows
- Creator and Capsule metadata
- Provider and key-release coordination

The normal website may use Laravel session authentication. The V1 browser extension uses OAuth Authorization Code with PKCE using the `S256` challenge method and Chrome's extension identity flow. The authorization redirect returns to the registered extension callback; redirect URIs must be matched exactly.

The extension is a public OAuth client and has no embedded client secret. It receives short-lived, narrowly scoped access tokens without receiving or retaining the account password. CTX tokens are sender-constrained to the registered Ed25519 Viewer proof key, and API requests prove possession of that key. The separate X25519 Viewer agreement key receives HPKE-wrapped content keys. Device Authorization is deferred as a possible fallback for future platforms.

Laravel Passport implements the authorization server, PKCE validation, authorization-code issuance, and refresh rotation. The fixed V1 client has no secret, registers exactly one environment-specific extension callback, and requires verified-account consent. Connection is deliberately two-stage. The first approval issues only a ten-minute `extension:connect` bearer token used to register separate device keys; its internally created refresh token is immediately revoked and never returned. After registration, a second PKCE approval for the mutually exclusive `ctx:authorize` scope requires a fresh token-endpoint DPoP proof and the active device identifier. The resulting ten-minute access-token JWT contains `cnf.jkt`, is unusable through the Bearer scheme, and is accompanied by a 30-day rotating refresh token bound to the same device proof key.

Every refresh requires a new token-endpoint DPoP proof. A successful refresh revokes the prior access and refresh tokens. Reuse of a rotated refresh token revokes the remaining token family for that device. Suspending or permanently revoking a Viewer device immediately revokes all of its access and refresh tokens; activation does not restore them, so the extension must authorize again. Refresh tokens are sensitive extension state and never enter page scripts, URLs, logs, or the Host.

Account closure is a separate reversible lifecycle state with a fixed 30-day deadline. Laravel immediately rejects closed accounts at web, API, authorization, and token-issuance boundaries; removes their active sessions and pending device challenges; revokes OAuth credentials; and suspends active Viewer devices. A versioned Capsule inventory is available before closure and through the signed recovery flow. Verified-email recovery uses a rotatable high-entropy token, an expiring signed review link, and a short-lived signed `POST`. Restoration reopens the account but intentionally leaves all previous sessions, tokens, and devices inactive.

An hourly, overlap-protected deletion command processes a bounded set of expired closures and provides a dry-run count for operational inspection. Each deletion is independently locked, revalidated, and transactional. Account-linked credentials and profile state are erased before the account row and its cascading device/passkey records. Explicit deletion participants reserve the atomic boundary required by sanction retention, the deletion ledger, and future local Capsule or broker outbox work; any failure leaves the account closed and eligible for retry.

After policy approval, Laravel issues a 60-second, single-use Ed25519-signed JWT ticket for the exact broker, Capsule revision, policy, payload, action, suite, and Viewer device-key set. Provider metadata publishes the issuer, public ticket-signing keys, ticket profile, and redemption endpoint. The isolated broker validates the ticket locally and redeems it online before returning an HPKE-wrapped content key. Ticket issuance, validation, and redemption live behind explicit interfaces even though V1 configures only Share Capsules. See [CTX authorization and key release](../05_ctx/authorization-and-key-release.md).

## Laravel exclusions

The main Laravel application must not receive or retain:

- Creator signing private keys
- Unencrypted creator source content
- Unwrapped Capsule content keys
- Decrypted Capsule payloads

Laravel application encryption is intended for protecting application data at rest. It is not the Capsule encryption protocol and must not be used as a substitute for portable Capsule cryptography.

## Client-side TypeScript responsibilities

The browser extension and shared TypeScript library provide:

- Creator signing-key generation and use
- Viewer proof-key and agreement-key generation and use
- Local source-file reading
- Per-payload content-key generation
- Local payload encryption
- Canonical manifest construction
- Creator signature generation and verification
- Content-key wrapping and unwrapping
- Capsule packaging and parsing
- Versioned content-profile interfaces and registry
- CTX authorization interaction
- Local protected-content decryption and rendering

Plaintext creator content remains on the creator-controlled device during Capsule creation. Only the encrypted Capsule and intended public metadata are uploaded.

## Capsule creation flow

1. The creator selects a local source file.
2. The extension generates a unique random content-encryption key.
3. The extension encrypts the payload locally.
4. The extension constructs a canonical manifest.
5. The extension protects the content key through the selected key-release arrangement.
6. The extension signs the manifest with the creator-controlled signing key.
7. The extension packages the manifest, signature, public assets, and encrypted payload into a Capsule.
8. The creator downloads or exports the completed encrypted Capsule.
9. The creator publishes the Capsule and optional public fallback assets through a creator-selected Host.
10. Share Capsules retains only the metadata required for account, policy, and authorization services.

## Static reference Host

The project should provide a minimal static example demonstrating that a Host does not need account, CTX, key-release, or decryption capabilities.

The reference example is a small artist gallery containing several independently protected Capsules. An example distribution may contain:

```text
reference-host/
├── index.html
├── previews/
│   ├── artwork-01.jpg
│   ├── artwork-02.jpg
│   └── artwork-03.jpg
└── capsules/
    ├── artwork-01.capsule
    ├── artwork-02.capsule
    └── artwork-03.capsule
```

The page presents each Capsule through declarative custom-element markup with accessible fallback content. For example:

```html
<capsule-viewer src="./capsules/artwork-01.capsule">
  <img src="./previews/artwork-01.jpg" alt="Public artwork preview">
  <a
    href="https://sharecapsules.com/open?capsule=https%3A%2F%2Fcreator.example%2Fcapsules%2Fartwork-01.capsule"
  >
    View protected artwork
  </a>
</capsule-viewer>
```

Without the extension or site permission, the nested preview and link remain ordinary fallback content. On an approved site, the extension discovers the element and inserts an extension-origin inline Viewer frame. The tag itself does not receive account state, trust results, keys, or plaintext.

The reference Host requires only HTTPS, ordinary HTML, and static-file delivery. It does not load a Share Capsules JavaScript SDK. Capsule responses use unauthenticated `GET`, preferably support `HEAD`, provide a usable length or bounded stream, allow public CORS, use an accepted V1 media type, and keep each revision URL immutable. Range requests are not required in V1. See [Compatible Host contract](compatible-host.md).

The Host must not receive Share Capsules account identifiers, trust evidence, authorization tokens, content keys, or plaintext.

## Shared client library

Capsule creation and viewing should use the same versioned TypeScript implementation for:

- Manifest schemas
- Canonical serialization
- Cryptographic algorithms and parameters
- Capsule identifiers
- Format-version and revision compatibility rules
- Package layout
- Validation
- Cross-implementation test vectors

The library should be independently testable and should not depend on Share Capsules application state for format correctness.

## V1 package handling

The shared library reads and writes `.capsule` ZIP containers containing `manifest.json`, `manifest.sig`, and ID-addressed encrypted entries under `payloads/`. It canonicalizes the manifest according to RFC 8785 before signing or verification. The signed manifest contains a payload list with the declared path, media type, byte length, and cryptographic hash for every encrypted entry.

V1 emits and accepts exactly one image payload while retaining the plural payload-list shape. It does not embed preview bytes. Creator Studio may generate suggested public fallback markup and an optional external preview file for the Host, but those assets are not signed Capsule content.

ZIP container metadata is outside the signature boundary. Parsers must enforce the V1 entry allowlist and size limits before allocating or processing content; reject duplicates, path traversal, symbolic links, undeclared content, unsupported ZIP features, and hash or length mismatches; and avoid filesystem extraction.

## Initial payload constraints

The Capsule format is media-agnostic and describes arbitrary binary payloads with signed type and size metadata. The first Share Capsules Viewer profile remains a deliberately narrow implementation slice:

- One image payload per Capsule for the reference gallery
- Several independent Capsules linked from one static gallery page
- One manifest version
- One supported cryptographic suite
- One Share Capsules CTX Provider
- One key-release arrangement
- One Chrome/Chromium-compatible desktop extension

V1 implements one trusted image content-profile class shared by creator tooling and the Viewer. It supports static JPEG, PNG, and WebP after validating file signatures and rejecting animated variants. SVG, GIF, APNG, animated WebP, and unrecognized image forms are unsupported.

The generic client library resolves a signed profile identifier through a local implementation registry. Later content classes can be added without changing the Capsule parser or CTX flow. Capsules do not carry executable profile implementations, and unsupported profiles fail closed rather than falling back to plaintext download.

This Viewer-profile restriction is not a Capsule-format restriction. A Capsule may identify other media types even when a particular Viewer cannot render them.

V1 uses whole-payload authenticated encryption and stores one `payloads/<payload-id>.enc` entry. Browser cryptographic APIs commonly accept complete buffers rather than providing portable authenticated-encryption streams, so each Viewer profile must publish a payload-size limit validated through representative memory and performance testing.

Authenticated chunking is deferred until a supported scenario requires large-file processing, streaming, seeking, range requests, or resumable transfer. See [Chunking and large payloads](../04_capsule/chunking-and-large-payloads.md).

V1 packages one image rendition and downloads the complete Capsule. Encoded-file, decoded-pixel, dimension, peak-memory, creation-time, and open-time limits are selected through representative supported-device benchmarks and published as the V1 image-profile compatibility envelope.

Multiple responsive renditions and selective HTTP-range retrieval are deferred until measurements demonstrate a practical need. See [Adaptive renditions and device capability](../04_capsule/adaptive-renditions.md).

## Cryptographic implementation constraints

The single V1 suite uses AES-256-GCM for payload encryption; separate Ed25519 keys for creator signatures and Viewer device proof; SHA-256 for hashing; and HPKE with X25519, HKDF-SHA-256, and AES-256-GCM for delivery to registered Viewer devices. See [V1 cryptographic suite](../07_security-and-privacy/cryptographic-suite-v1.md).

- Use established browser cryptographic APIs or carefully reviewed cryptographic libraries.
- Generate a new content key for every protected payload.
- Never derive creator or content keys directly from an account password.
- Use unique nonces for every authenticated encryption operation.
- Keep signing, device, content, wrapping, and authorization keys separate.
- Record the Capsule format version, Capsule revision, cryptographic-suite identifier, algorithm identifiers, and key identifiers in the signed manifest.
- Define deterministic manifest bytes before signing.
- Publish cross-language test vectors before claiming interoperability.

## Creator-key recovery

Client-side creation makes creator-key recovery a required product flow. The extension generates the signing key and an encrypted recovery bundle locally. Before first publication, the creator must confirm that the bundle and its separately generated recovery code have been saved.

The account password must not encrypt the bundle or derive the recovery code. Share Capsules may store an opaque copy of the encrypted bundle, but it must not receive information sufficient to decrypt it. Recovery, import to a replacement device, incorrect-code handling, backup confirmation, and key rotation must be tested before creators entrust irreplaceable work to the production system.

If the active device, recovery bundle, and recovery code are lost, Share Capsules cannot restore the previous signing authority. Account recovery may let the creator establish a new signing key, but it must not silently claim continuity with the lost key.

## Key-release isolation

V1 uses one Share Capsules-operated key broker. The broker is logically isolated from the main Laravel application through separate APIs, credentials, data access, authorization boundaries, and audit logs. Its production wrapping keys should be protected by a managed KMS or HSM-backed design and should not be directly available to normal Laravel application processes.

The initial deployment may share operational infrastructure. This is a practical V1 custody model, not a claim that Share Capsules is cryptographically incapable of decrypting creator content. An operator controlling both the authorization service and broker could theoretically cause a release, and product language must state that limitation honestly.

The broker interface, Capsule metadata, and release protocol must not prevent migration to an independent provider, a creator-operated broker, or split-key release.

## Open questions

- What benchmark devices and acceptance thresholds define the V1 image-profile compatibility envelope?

## Related documents

- [System overview](system-overview.md)
- [Accounts and identity](accounts-and-identity.md)
- [Key management](key-management.md)
- [Access and data flow](access-and-data-flow.md)
- [Browser Viewer](../06_viewer/browser-viewer.md)
- [Chunking and large payloads](../04_capsule/chunking-and-large-payloads.md)
- [Viewer content profiles](../06_viewer/content-profiles.md)
- [Adaptive renditions and device capability](../04_capsule/adaptive-renditions.md)
- [V1 cryptographic suite](../07_security-and-privacy/cryptographic-suite-v1.md)
- [CTX authorization and key release](../05_ctx/authorization-and-key-release.md)
- [V1 creator and viewer experience](../02_product/v1-user-experience.md)
- [Compatible Host contract](compatible-host.md)
