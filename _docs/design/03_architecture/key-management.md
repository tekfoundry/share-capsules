# Key Management

Status: Draft
Last updated: 2026-06-22

## Purpose

Define the key hierarchy and creator-ownership constraints used by Share Capsules, Capsule, CTX, and trusted Viewers.

## Core rule

An account does not have one general-purpose encryption key. Authentication, creator authenticity, device identity, payload encryption, and key delivery use separate keys with explicit purposes.

## Key hierarchy

| Key or credential             |                                  Quantity | Purpose                                            |
| ----------------------------- | ----------------------------------------: | -------------------------------------------------- |
| Account authenticator         |                               One or more | Authenticate the Share Capsules account            |
| Viewer device proof key       |  One Ed25519 pair per Viewer installation | Sign device challenges and sender-constrain tokens |
| Viewer device agreement key   |   One X25519 pair per Viewer installation | Receive HPKE-wrapped content keys                  |
| Creator signing key           |                    One or more, versioned | Sign Capsule manifests and creator assertions      |
| Capsule content key           | One unique random key per Capsule payload | Encrypt protected content                          |
| Key-wrapping or release key   |         Rotatable by provider and purpose | Protect and release Capsule content keys           |
| CTX authorization-signing key |             Rotatable Ed25519 service key | Sign short-lived key-release tickets               |
| Authorization or session key  |                               Short-lived | Bind other access or session state where required  |

Keys must include or be associated with a key identifier, purpose, algorithm, creation time, owner, and lifecycle status.

V1 uses AES-256-GCM content keys, separate Ed25519 creator-signing and Viewer-proof keys, X25519 Viewer agreement keys for HPKE delivery, and SHA-256 hashing under one named suite. Key purposes are not interchangeable. See [V1 cryptographic suite](../07_security-and-privacy/cryptographic-suite-v1.md).

## Capsule creation

For every protected payload, creator tooling:

1. Generates a new random content-encryption key.
2. Encrypts the payload locally with that content key.
3. Protects the content key through the creator-selected key-release arrangement.
4. Records the required key identifiers and algorithms in the manifest.
5. Signs the manifest with the active creator signing key.

The extension creates one payload-scoped secret handle for step 1. That handle owns exactly one independently generated 32-byte content key and 12-byte nonce, permits only serialized temporary content-key access for broker registration and encryption, returns defensive nonce copies, and is destroyed after the complete create/register/encrypt/package/verify workflow settles. Generic Creator Studio presentation never receives either value.

Broker acceptance does not immediately make a content key releasable. New material is stored under a stable registration identity in a bounded `pending` state. Only an idempotent finalization bound to a strictly verified Capsule revision may activate it. Signing, packaging, verification, download-preparation, or finalization failure triggers idempotent cancellation; abandoned pending material expires into scheduled cleanup. Cleanup destroys protected key material and custody metadata and is safe to retry after ambiguous transport outcomes.

The durable control-plane Capsule registry records lifecycle intent, while the broker remains authoritative for custody and actual key destruction. Cross-service coordination must fail closed: `pending`, `revocation_pending`, `cleanup_pending`, `revoked`, and `destroyed` records cannot release keys. Metrics are evidence about operations, never lifecycle authority.

Creator-requested Capsule deletion is a per-revision destruction workflow, not a database-row deletion. The control plane first moves an owned active or revoked record to `cleanup_pending`, the broker irreversibly destroys and unlinks only the matching revision's protected content key, and the control plane retains a terminal `destroyed` tombstone. Ambiguous broker responses remain retryable through the existing cleanup schedule; externally stored encrypted Capsule files are outside Share Capsules' deletion boundary.

The creator does not manually select among low-level keys during ordinary Capsule creation. Tooling selects the active key appropriate to each purpose.

## Creator ownership

Creator signing keys are generated and used on creator-controlled devices. Share Capsules and other CTX services must not receive an unencrypted creator signing key.

In the Share Capsules reference implementation, creator and Viewer cryptography is performed by the TypeScript browser extension. The Laravel application coordinates accounts, policy, and authorization without handling creator plaintext or unencrypted creator signing keys.

Creators must be able to:

- Export their Capsules and policies
- Retain or recover creator signing authority
- Rotate compromised or retiring signing keys
- Select and replace compatible key-release providers
- Move content without re-encrypting the payload when safe rewrapping is possible
- Revoke future access according to the limits of issued authorization

The architecture should minimize the ability of any single Host, CTX evaluation service, or key provider to decrypt a Capsule independently.

## Key release

After a CTX service authorizes a Viewer, a creator-selected key-release provider returns the Capsule content key wrapped to that Viewer's registered device public key. The content key is unwrapped and used only inside the trusted Viewer.

V1 requires fresh online authorization for every Capsule open. The authorization is single-use at the broker. The Viewer keeps the unwrapped content key only in memory for the current Viewer session and discards it when the Viewer closes. V1 provides no offline access; reopening or reloading requires another authorization and successful key release.

V1 uses a single Share Capsules key broker that is strictly isolated from the main Laravel application. It has separate APIs, credentials, data access, authorization boundaries, and audit logs. Production deployment should use a managed KMS or HSM-backed design so wrapping keys are not exposed directly to ordinary application processes.

### Creator-account deletion

Closing a creator account immediately pauses authorization for every release handle it controls. During the 30-day account-recovery period, no new key releases occur; restoring the account through the secure recovery flow may reactivate them.

V1 has no protocol-level ownership transfer. If a creator gives an unencrypted original to another person through an external channel, that person creates a new, independent Capsule with a new identifier, signature, policy, and release handle. Share Capsules does not move the original content key, release authority, signing key, trust history, or reputation to the recipient.

At the end of the recovery period, the broker revokes every remaining release handle and destroys the associated content-key material. The externally hosted encrypted Capsule files may continue to exist, but they become undecryptable through Share Capsules. Account deletion must not silently transfer release authority to a replacement account or recreate destroyed broker material.

This isolation reduces accidental access and limits compromise scope, but it is not a cryptographic zero-access guarantee: an operator controlling both policy evaluation and the broker could theoretically authorize a release. Share Capsules must describe this limitation plainly.

The Capsule format and release protocol must identify the key broker rather than permanently assuming Share Capsules. They must permit later migration to an independent, creator-operated, or split-key arrangement in which no single provider can release enough material to decrypt a Capsule.

## Key rotation and recovery

- Creator signing keys are versioned and may be active, retiring, revoked, or expired.
- Each Viewer installation's proof and agreement keys form one registered, independently revocable device-key set.
- Capsule content keys are unique so compromise does not automatically expose other Capsules.
- Provider wrapping keys rotate without requiring payload re-encryption when secure rewrapping is supported.
- Account recovery must not silently replace creator signing authority without an explicit recovery process.

Creator tooling keeps multiple local signing-key records but selects exactly one active key for new Capsules. Creating a replacement and making it active is one atomic local-store operation: the previous active record becomes retiring before the replacement is available for signing. An active key may become retiring or revoked; a retiring key may become revoked or expired; revoked and expired records are terminal and are never silently reactivated. If local state contains zero or multiple active records, signing fails closed.

Each record binds an opaque identifier, the `Ed25519` purpose and algorithm, the canonical public key, creation time, status-change time, lifecycle status, and its local private `CryptoKey`. Creator Studio may present only the public record summary. The private key handle remains behind the extension key-ring boundary and never enters the Laravel handoff, rendered DOM, logs, or ordinary network requests.

The locally generated private key is exportable only so the following recovery workflow can immediately place it into the required authenticated encrypted recovery bundle. Raw exported private-key bytes must not be persisted, rendered, logged, or uploaded. A key without confirmed recovery material cannot authorize first publication.

### Creator signing-key recovery

The creator signing key is generated locally. Before the first Capsule is published, creator tooling must create an encrypted recovery bundle and require the creator to confirm that the bundle and its separate recovery code have been saved.

The recovery code is generated independently of the Share Capsules account password. It must have sufficient random entropy and must not be uploaded in a form that allows Share Capsules to decrypt the bundle. Share Capsules may retain an opaque copy of the encrypted bundle for availability, and the creator may download additional copies, but possession of the account password or completion of account recovery must not reveal or replace the signing key.

Creator output is organized beneath a deterministic `share-capsules/workspaces/<workspace>/` directory. Each signing identity defines one workspace containing a public `workspace.json`, encrypted recovery bundles under `recovery/`, and completed artifacts under `capsules/`. Before saving a Capsule, the extension must have a validated encrypted recovery bundle for the exact signing key and must place or replace that bundle and the workspace manifest alongside the Capsule. The separate recovery code never enters the workspace. A missing or mismatched encrypted bundle blocks the Capsule save rather than creating an internally incomplete workspace.

The Chromium implementation requires the creator to choose the parent directory through the browser's directory picker. It stores the granted directory handle, not an assumed home-directory path, in extension-owned IndexedDB and rechecks write permission before use. The creator controls the parent and a validated lowercase kebab-case workspace name; `share-capsules`, `workspaces`, `recovery`, and `capsules` remain fixed structural names. Changing the selected parent creates or repairs the complete workspace structure in the new location before any Capsule is written.

Restoring signing authority requires the encrypted bundle and recovery code. Losing both the active creator device and usable recovery material means the prior signing authority cannot be recovered. The creator may establish a new signing identity, but Share Capsules must not silently represent it as the lost key.

The exact 32-byte recovery-code entropy, HKDF-SHA-256 derivation, AES-256-GCM envelope, authenticated public bindings, strict restoration checks, and publication gate are defined by [Creator Signing-Key Recovery V1](../10_specifications/capsule/creator-signing-key-recovery-v1.md).

## Open questions

- How is signing-key revocation distributed and verified?
- How are content keys rewrapped when a creator changes providers?

## Related documents

- [Accounts and identity](accounts-and-identity.md)
- [Access and data flow](access-and-data-flow.md)
- [Share Capsules reference implementation](share-capsules-reference-implementation.md)
- [Capsule design intent](../04_capsule/design-intent.md)
- [V1 cryptographic suite](../07_security-and-privacy/cryptographic-suite-v1.md)
- [CTX authorization and key release](../05_ctx/authorization-and-key-release.md)
