# Initial Share Capsules MVP

Status: In progress
Last updated: 2026-06-21

## Context

Share Capsules needs an operational proof of concept for the accepted Capsule and Capsule Trust Exchange (CTX) design. The MVP must demonstrate that a creator can package a static image locally, host the encrypted Capsule on an ordinary static HTTPS site, and allow an eligible viewer to decrypt and render it through the trusted browser extension after CTX policy evaluation and broker key release.

At plan approval, the repository contained design intent but no application code. The implementation uses:

- Laravel with MySQL and Redis for the Share Capsules account and CTX control plane
- A logically isolated Share Capsules Key Broker with separate APIs, credentials, data, and audit boundaries
- TypeScript packages shared by the creator and Viewer extension surfaces
- One Chrome/Chromium-compatible desktop extension for protected creation and viewing
- A static reference Host with multiple `<capsule-viewer>` elements
- Static JPEG, PNG, and WebP as the only V1 content profile

Capsule and CTX are intended for public development and independent review. TekFoundry sponsors and initially maintains the project; Share Capsules remains its reference implementation rather than a required provider for the open protocols.

This plan treats the documents under [`_docs/design`](../design/README.md) as accepted inputs. Broad federation, additional content profiles, hosting, mobile support, server-side decryption, general web fallback, behavioral tracking, ownership transfer, adaptive renditions, and chunking are outside the MVP.

Phase 2 is intentionally account-independent. It defines pure, versioned schemas, cryptographic behavior, message shapes, validation, fixtures, and test vectors using synthetic identifiers and keys. Phase 3 consumes those contracts for real accounts, OAuth, and registered devices; Phase 2 must not depend on a live account database or completed account implementation. After Phase 1, compatible portions of Phases 2 and 3 may proceed concurrently, but an integrating Phase 3 task waits for its relevant Phase 2 contract to stabilize.

## Design Intent

The MVP is complete when this end-to-end path works:

1. A creator creates and verifies one Share Capsules account.
2. The creator connects the official extension through OAuth Authorization Code with PKCE and registers a device-key set.
3. Creator tooling validates a conforming static image, creates or recovers the local creator signing key, encrypts the image locally, registers its content key with the isolated broker, builds and signs the Capsule, and downloads the `.capsule` file.
4. The creator places the Capsule on any compatible static HTTPS Host and adds `<capsule-viewer src="...">public fallback</capsule-viewer>` to a page.
5. A viewer grants the extension access to the Host, connects a verified account, reviews the required disclosure, and requests or automatically opens an eligible Capsule under site-scoped consent.
6. The extension verifies the Capsule and embedded policy, obtains a device-bound OAuth credential, requests CTX authorization, presents the single-use ticket to the broker, receives an HPKE-wrapped content key, decrypts locally, validates the image profile, and renders inside an extension-controlled surface.
7. Global and per-account Capsule limits and the optional V1 automation-risk predicate are enforced atomically at ticket redemption.
8. Plaintext, signing keys, and unwrapped content keys never enter ordinary Laravel application paths or Host-page JavaScript.
9. Failure, revocation, account deletion, retention, and no-extension behavior match the documented privacy and security boundaries.

Foundational formats and interfaces must remain provider-aware and versioned even though V1 configures only Share Capsules. Replaceable deployment and UI details may remain simple when they preserve those boundaries.

## Deployment Posture

A production Share Capsules environment already exists. MVP development does not deploy each completed phase to that environment. Production deployment is intentionally deferred until there is a coherent, user-visible capability worth operating and an explicit deployment review confirms that its security, migration, rollback, and observability requirements are ready. The complete creator-to-viewer vertical slice is the current candidate for that first value gate; completing an isolated internal component alone does not require a production release.

Production configuration and operational changes are tracked in the version-controlled [production change ledger](../operations/production-change-ledger.md). The ledger records environment-variable names, migrations, infrastructure or identity changes, deployment actions, verification, and rollback considerations, but never secret values. Environment templates remain the authoritative inventory of required variable names and safe examples.

## Implementation Phases

### Phase 1 — Repository and application foundation

Objective: establish a reproducible workspace and a secure Laravel baseline without prematurely implementing protocol behavior.

- ✅ Create the Laravel application under `code/` with supported PHP and framework versions pinned.
- ✅ Configure local MySQL, Redis, queues, scheduler, mail capture, and environment templates without committing secrets.
- ✅ Define the TypeScript workspace for Capsule Core, CTX client, Share Capsules adapter, extension, and shared test fixtures.
- ✅ Add formatting, static analysis, unit-test, integration-test, and production-build commands for PHP and TypeScript.
- ✅ Establish CI that installs from lockfiles and runs all non-browser checks.
- ✅ Define development, test, and production configuration boundaries, including distinct OAuth and extension identities.
- ✅ Add health checks, structured redacted logging, correlation identifiers, and a local service topology.
- ✅ Record exact runtime prerequisites and one-command local setup instructions.

All Composer, npm, Artisan, build, and test commands run through `_infra/kit` inside the pinned app container. Host runtimes are not authoritative for dependency installation or release verification.

Success goals:

- A new contributor can start Laravel, MySQL, Redis, queues, and the TypeScript build from documented commands.
- CI passes on an unchanged scaffold.
- Secrets, plaintext content, tokens, and cryptographic keys are excluded from logs and version control.

Completion evidence recorded on 2026-06-20:

- Docker reports the app, MySQL, Redis, and Mailpit healthy.
- The stateless `/up` endpoint reports healthy deployment configuration, MySQL, and Redis without returning connection details or creating a session.
- Composer validation, PHP formatting, TypeScript typecheck/lint/format, workspace linkage, and the Vite production build pass in the app container.
- The Laravel integration suite passes 6 tests and 15 assertions against the dedicated MySQL test database and Redis.
- The checked-in CI workflow invokes the same lockfile-driven Docker topology and non-browser gates through `_infra/kit ci`.
- The aggregate `./_infra/kit check` command passed in the developer environment.

### Phase 2 — Versioned Capsule and CTX contracts

Objective: implement the stable, provider-aware contracts before building product workflows around them.

- ✅ Define the V1 Capsule manifest schema, restricted payload identifier rules, ZIP entry allowlist, and exact version fields.
- ✅ Define the named V1 cryptographic suite identifiers and reject unknown or downgraded suites.
- ✅ Implement RFC 8785 JSON Canonicalization and detached Ed25519 manifest signing and verification.
- ✅ Implement AES-256-GCM whole-payload encryption with the accepted nonce, tag, and associated-data bindings.
- ✅ Implement SHA-256 entry commitments and strict actual-versus-declared validation.
- ✅ Define the V1 static-image profile identifier, signed metadata, and accepted 25 MiB, 16,384-pixel-per-side, 40-megapixel, and 160 MB decoded envelope.
- ✅ Define structured embedded policy JSON with the single V1 `all` combiner and stable predicate identifiers.
- ✅ Define CTX issuer discovery, broker discovery, ticket claims, DPoP proof, HPKE context, and error schemas.
- ✅ Create cross-package positive and negative fixtures for valid, malformed, tampered, oversized, downgraded, and unsupported Capsules.
- ✅ Publish deterministic cryptographic and canonicalization test vectors used by PHP and TypeScript tests.

Success goals:

- Independent PHP and TypeScript tests agree on canonical bytes, signatures, hashes, policies, ticket claims, and failure cases.
- Unknown versions, profiles, algorithms, entries, paths, and predicates fail closed.
- No contract assumes that Share Capsules is the only possible CTX Provider or Key Broker.

Completion evidence recorded on 2026-06-20:

- The language-neutral fixture catalog covers valid, malformed, tampered, oversized, downgraded, and unsupported Capsule cases across manifest, archive, signature, and entry-commitment boundaries.
- The shared vector set fixes canonical JSON, policy, manifest, SHA-256, Ed25519, AES-256-GCM, CTX ticket, HPKE context, and project-specific HPKE outputs.
- TypeScript reproduces every published vector and exercises fail-closed HPKE behavior using the lockfile-pinned RFC 9180 implementation.
- PHP consumes the same JSON and independently verifies canonical-byte hashes, entry commitments, Ed25519 signatures with Sodium, and AES-256-GCM with OpenSSL.
- Independent PHP HPKE verification remains a Phase 5 broker implementation gate because PHP does not yet have a project HPKE adapter; the vector itself is stable now.

### Phase 3 — Accounts, authentication, devices, and lifecycle

Objective: provide the single Share Capsules account and device-continuity boundary required by both creator and viewer roles.

- ✅ Implement account registration with email, password, terms acceptance, and secure password hashing.
- ✅ Require email verification before Capsule creation, device registration, reputation accumulation, or protected viewing.
- ✅ Implement login, logout, password reset, security notifications, session inspection, and session revocation.
- ✅ Adopt Laravel Fortify handlers for the existing authentication flows and add optional passkey enrollment, multiple authenticators, inspection, and revocation without treating passkeys as personhood.
- ✅ Implement OAuth Authorization Code with PKCE `S256` for the fixed public extension client, verified-account consent, one exact callback, and single-use authorization codes; keep interim bearer tokens away from CTX routes until device binding and DPoP are complete.
- ✅ Register one device record containing distinct Ed25519 proof and X25519 agreement public keys only after independent possession proofs over a short-lived, account-bound challenge.
- ✅ Issue short-lived, narrowly scoped, DPoP-bound access tokens and rotated refresh tokens where enabled.
- ✅ Provide device inspection, naming, recently authenticated suspension and activation, and permanent revocation; complete token invalidation as part of the DPoP-bound token task.
- ✅ Implement signup and authentication abuse throttles without creating hidden behavioral tracking.
- ✅ Implement account closure, immediate access suspension, the 30-day recovery period, Capsule inventory export, and secure restoration.
- ✅ Implement permanent account deletion, removal of the detailed trust profile, and non-inheritance by replacement accounts.
- ✅ Implement the restricted active-sanction tombstone and its accepted 90-day maximum; leave no tombstone for ordinary deletion.
- ✅ Implement the deletion ledger and verify deletion is reapplied before a restored backup serves traffic.

Success goals:

- Passwords never enter the extension, and browser sessions are never forwarded as CTX credentials.
- Revoking a device invalidates both device keys and continuing extension access.
- Closure immediately prevents creation and viewing; restoration works only within 30 days; permanent deletion is irreversible.
- Account behavior makes no one-human-one-account claim.

### Phase 4 — Public project launch and feedback

Objective: publish an honest, compelling explanation of the problem and proposed solution so creators, implementers, and security reviewers can understand the project and provide useful feedback while development continues.

- ✅ Rewrite the public front page around a clear creator problem statement, followed by concise `why`, `what`, and `how` sections.
- ✅ Explain that Share Capsules is intended to reduce effortless, anonymous, large-scale harvesting without promising copy prevention, perfect human detection, or protection from an authorized viewer.
- ✅ Create a polished, accessible visual workflow showing creation, encrypted static hosting, CTX policy evaluation, broker key release, and local Viewer decryption.
- ✅ Create a dedicated “How it works” page that explains the creator, Host, provider, broker, and Viewer boundaries in approachable language.
- ✅ Create a living technical-overview page covering Capsule and CTX terminology, architecture, cryptographic boundaries, trust and privacy, provider independence, V1 limitations, and links to the detailed design documents.
- ✅ Clearly distinguish the long-term vision, implemented capabilities, active development, and deferred work on every page where readers could otherwise infer production readiness.
- ✅ Add visible TekFoundry sponsorship, `info@tekfoundry.com`, open-source participation, GitHub, and feedback calls to action without presenting TekFoundry as the only possible future CTX Provider.
- ✅ Add page titles, descriptions, canonical URLs, social-sharing metadata and image, semantic landmarks, keyboard support, reduced-motion behavior, and responsive layouts.
- ✅ Add automated page, content, metadata, link, accessibility-smoke, and responsive-layout tests that lock down important public claims without making ordinary copy edits brittle.
- ✅ Perform a manual review on representative desktop and mobile sizes for clarity, accessibility, visual hierarchy, broken links, and accidental security or readiness overclaims.

Success goals:

- A creator unfamiliar with the project can identify the problem, proposed approach, current status, and next action from the front page.
- The workflow makes clear that Hosts serve encrypted files, CTX evaluates access, and protected content is decrypted only inside the trusted Viewer boundary.
- Technical readers can reach the architecture, privacy model, threat model, specifications, source, and feedback channel without searching the repository.
- Public language invites scrutiny and participation while accurately describing the MVP as software under active development.

### Phase 5 — Isolated broker and CTX authorization control plane

Objective: authorize exact Capsule releases without exposing raw content keys to the normal Laravel application.

- ✅ Implement provider discovery metadata, version negotiation, public signing keys, and controlled key rotation.
- ✅ Implement the broker as a separately deployable component with dedicated credentials, storage, API, and audit access.
- ✅ Define a KMS/HSM adapter and a local development implementation that preserves the production trust boundary.
- ✅ Register creator-provided content keys through an authenticated extension-to-broker flow and return opaque high-entropy release handles.
- ✅ Ensure normal Laravel application processes cannot retrieve raw broker wrapping keys or unwrapped content keys.
- ✅ Implement preliminary policy evaluation for verified email, active account, registered device, disclosure consent, limits, and optional automation risk.
- ✅ Issue 60-second, single-use, Ed25519-signed CTX JWT tickets with the exact type, audience, Capsule, revision, policy, payload, action, suite, and device-key bindings.
- ✅ Implement strict broker ticket validation, fresh device proof, and HPKE wrapping to the registered X25519 agreement key.
- ✅ Implement online ticket redemption with atomic replay prevention and global/per-account committed-release counter increments.
- ✅ Ensure an unredeemed ticket never counts and a committed release counts even if the final response is lost.
- ✅ Implement a versioned, provider-aware metrics event and idempotent projection model for authorization attempts, privacy-safe denials, and authoritative broker-committed releases without copying viewer identity or raw trust evidence into creator analytics.
- ✅ Implement Capsule and account revocation, paused creator releases during account closure, and broker-key destruction after permanent deletion.
- ✅ Implement V1 deterministic automation-risk rules using only CTX authorization and committed-release metadata.
- ✅ Expose privacy-safe denial categories to the Viewer while withholding global identity and raw history from creators and Hosts.

Success goals:

- Concurrent redemption tests cannot exceed global or per-account Capsule limits.
- Replayed, expired, mis-audienced, mis-bound, downgraded, or revoked tickets fail closed.
- The Laravel control plane cannot independently cause arbitrary content-key disclosure through ordinary credentials.
- Creators receive only allowed predicates and Capsule aggregates; Hosts receive no trust-profile data.

Phase 5 discovery and signing-key evidence recorded on 2026-06-21:

- The stateless RFC 8414-style discovery endpoint publishes the exact closed-world CTX V1 provider capabilities and derives every endpoint from the configured issuer.
- The JWKS endpoint publishes only purpose-bound Ed25519 public keys and fails closed when no key is available.
- Ticket-signing keys have an explicit published, active, retiring, retired, and emergency-revoked lifecycle. Rotation publishes a replacement before activation and retains the previous public key for the exact 60-second ticket lifetime plus five seconds of accepted clock skew.
- Dedicated commands stage, activate, revoke, and retire keys; private key material is encrypted at rest and excluded from JSON serialization and discovery responses.
- Automated tests cover discovery-path insertion, exact metadata, unsafe identities, public-key shape, encrypted private storage, overlap, expiry, emergency revocation, invalid transitions, and the 16-key protocol limit.

Phase 5 broker-isolation evidence recorded on 2026-06-21:

- The same locked application artifact can boot as a distinct `broker` runtime with a deliberately restricted public and authenticated-internal route surface; it omits account, session, Fortify, Passport, passkey, storage-serving, and control-plane routes and providers.
- The local broker runs in its own container and uses an idempotently provisioned database and database user that are unavailable to the normal application container.
- A dedicated, minimum-entropy service credential protects the broker's internal API. Failed authentication uses constant-time comparison and emits a sanitized event through an explicit broker audit boundary without recording the presented credential.
- Public broker discovery publishes the exact CTX V1 broker identity, release endpoint, ticket type, and cryptographic suite. The release endpoint fails closed until key-release behavior is implemented.
- Broker health checks only broker configuration and isolated storage. Runtime smoke checks verified broker discovery, healthy storage, authenticated and unauthenticated internal access, the restricted broker route surface, and no control-plane home route.

Phase 5 key-custody evidence recorded on 2026-06-21:

- Broker content-key protection depends on a small `KeyProtectionService` boundary whose contract can be implemented by a managed KMS or HSM without exposing the provider key to callers.
- The local-only implementation uses a dedicated 256-bit master key, AES-256-GCM, a fresh 96-bit nonce, a 128-bit tag, canonical base64url storage, a stable key identifier, and authenticated binding to the opaque broker record identifier.
- Wrong context, tampered ciphertext, noncanonical encoding, wrong key identifiers, invalid content-key length, and invalid local custody configuration fail closed.
- The local custody key is delivered only to the broker container. Production configuration rejects the local driver and reserves an explicit managed-custody key identifier for the later infrastructure selection.

Phase 5 content-key registration and isolation evidence recorded on 2026-06-21:

- A device-bound `capsule:create` OAuth grant authorizes a 60-second registration capability bound to the creator, registration identifier, Capsule, payload, and SHA-256 content-key digest; the control plane receives only the digest and stores only a token hash.
- The extension sends the raw 256-bit content key directly to the broker. The broker authenticates the capability over a dedicated callback credential, protects the key through the custody adapter, stores only authenticated ciphertext, and returns a random 256-bit opaque release handle.
- Exact retries are idempotent and return the same handle; identifier reuse, expired or mismatched grants, malformed keys, unknown fields, and failed callbacks fail closed.
- The ordinary Laravel runtime has neither the broker provider, custody binding, local custody key, broker credentials, registration endpoint, release endpoint, nor broker database identity. Automated isolation tests lock down those boundaries.
- A recreated broker container applied only the isolated broker migration and a runtime request exercised the callback boundary, returning `registration_not_authorized` for a fabricated grant without persisting a key.

Phase 5 preliminary-policy evidence recorded on 2026-06-21:

- The PHP policy parser independently enforces the exact closed-world V1 type, version, `all` combiner, mandatory predicates, canonical ordering, optional creator gates, safe-integer limits, HTTPS assertion issuer, and unknown-field rejection already locked by the TypeScript contract.
- The evaluator checks current verified email, active account, active same-account Viewer device, explicit view-event consent, preliminary committed-release capacity, and the optional issuer-specific automation-risk decision in deterministic order.
- Decisions expose only the stable CTX categories. Exact usage, risk history, thresholds, account identity, and raw evidence never enter the result; missing optional risk evidence fails closed as `policy_unsatisfied`.
- Release counts and automation risk remain explicit provider interfaces so authoritative concurrent counters and the deterministic V1 risk implementation can be attached in their dedicated Phase 5 tasks without weakening policy semantics.

Phase 5 ticket-issuance evidence recorded on 2026-06-21:

- The discovered `/ctx/authorize` endpoint requires a fresh DPoP proof and the `ctx:authorize` scope, re-parses the exact policy, independently reproduces its RFC 8785 digest, applies preliminary policy, and emits only the reviewed CTX response or privacy-safe error envelope.
- Before issuance, the control plane authenticates to the isolated broker and verifies that the creator-registered active key record binds the exact Capsule, revision, policy digest, payload, and opaque release handle. An unsigned Viewer restatement cannot weaken the registered policy.
- The dedicated issuer locks exactly one active purpose-bound Ed25519 key and signs the closed-world `ctx-key-release+jwt` header and claims with exact issuer, broker audience, random 256-bit `jti`, 60-second lifetime, action, suite, and both Viewer-key thumbprints.
- The public ticket contains no subject or account identifier. A private pending record maps the `jti` to current account, device, creator limits, assertion issuer, and exact release bindings for later atomic redemption.
- Automated signature, claim-shape, lifetime, DPoP, broker-binding, RFC 8785 vector, missing-key, and identity-isolation tests pass. The isolated broker migration was also applied in a recreated healthy runtime.

Phase 5 broker-validation and HPKE evidence recorded on 2026-06-21:

- Broker validation pins the configured issuer and exact broker audience, `ctx-key-release+jwt`, EdDSA, known purpose-bound `kid`, exact claims, 60-second lifetime, clock skew, registered active release binding, action, suite, and every Capsule, policy, payload, and device-key field.
- The fresh `ctx-key-release-proof+jwt` parser accepts only the exact Ed25519 public JWK and claims, verifies signature, endpoint, ticket hash, 60-second freshness, both device thumbprints, and a database-backed unique proof identifier. Exact proof replay fails closed.
- The broker recovers protected content-key material only after ticket and proof validation, then prepares RFC 9180 base-mode X25519/HKDF-SHA-256/AES-256-GCM output bound to the canonical V1 info and AAD contexts.
- PHP reproduces the independently generated V1 HPKE `enc` and ciphertext vector exactly. Integration tests also validate a newly signed ticket and proof, prepare a correctly sized wrapped key, and reject replay.
- Preparation is intentionally not exposed by `/releases` yet: no wrapped key leaves the broker until the following atomic online-redemption task commits the release.

Phase 5 redemption evidence recorded on 2026-06-21:

- `/releases` now validates and prepares first, calls the authenticated online redemption boundary, and returns the prepared HPKE response only after the control plane reports a committed transaction.
- Redemption locks the pending ticket, account, device, Capsule counter, and account-and-Capsule counter; rechecks expiry, account/device bindings, creator limits, and optional risk; then consumes the ticket and increments both counters in one retryable database transaction.
- Missing, mismatched, expired, denied, or abandoned tickets never increment. Exact replay returns `ticket_replayed`; two pending tickets against a maximum of one produce one commit and one denial with a final count of one.
- A control-plane commit is authoritative even if its HTTP response is lost. In that case the broker withholds the wrapped key, while the committed counters and consumed ticket remain durable, preventing a client-controlled acknowledgement bypass.
- The full automated gate at that checkpoint passed with 244 TypeScript tests and 180 PHP tests / 920 assertions. The isolated device-proof replay migration was applied in a recreated healthy broker runtime.

Phase 5 metrics evidence recorded on 2026-06-21:

- A closed version-1 event envelope records the provider, optional broker, Capsule and revision, event type, occurrence time, and only reviewed creator-safe denial categories. Optional dimensions are deliberately empty, and account, device, ticket, proof, and raw trust evidence are absent.
- Every projection key includes a canonical provider hash, preventing records from different CTX providers from being combined while avoiding database index-length ambiguity.
- Event receipt and aggregate projection occur in one transaction. A unique event identifier makes repeated delivery idempotent; automated tests prove that duplicate committed-release and ticket-rejection delivery increments each aggregate exactly once.
- Authoritative `redemption_committed` recording participates in the same control-plane transaction that consumes the ticket and increments release counters. Authorization attempts, approvals, reviewed denials, and deterministic ticket rejections feed totals, hourly buckets, and safe denial-category aggregates.
- Raw event records are pruned after 30 days by the existing daily scheduler. Durable projections contain no viewer or account identity columns.
- The application test harness now refuses any persistent database unless it exactly matches the explicit test database and differs from the development database. The full gate passes with 244 TypeScript tests and 193 PHP tests / 973 assertions.

Phase 5 revocation and deletion evidence recorded on 2026-06-21:

- The control plane uses one explicit authenticated broker lifecycle boundary for creator-wide pause, creator-wide resume, Capsule-revision revocation, and creator-wide destruction. Commands have closed request shapes, are idempotent, and affect only records whose broker-owned creator binding matches.
- Account closure remains fail-closed even if the broker is temporarily unavailable: the committed closed-account state immediately prevents authorization and redemption, while a successful broker call also moves active creator keys to `paused`. Restoration requires broker resume before the local account transaction can commit and never revives an explicitly revoked key.
- Capsule revocation is irreversible, prevents binding validation and key recovery, and emits one idempotent provider-aware revocation metric. A final active-record check after control-plane redemption ensures a lifecycle change applied during release processing withholds the wrapped key.
- Permanent account deletion invokes broker destruction before erasing personal data. Destruction nulls the protected content-key material, custody metadata, and account link while retaining a minimal destroyed release record; broker failure aborts local erasure so the scheduled deletion can retry safely.
- Deletion-ledger replay reapplies broker destruction for every retained account identifier even when only broker storage was restored, and it does not mark the restore checkpoint complete until those operations succeed.
- The isolated local broker applied the lifecycle migration and reports healthy. The full gate passes with 244 TypeScript tests and 202 PHP tests / 1,037 assertions.

Phase 5 automation-risk evidence recorded on 2026-06-21:

- The named `ctx-automation-risk-v1.0` ruleset deterministically checks conservative, exact rolling boundaries for authorization velocity, committed-release velocity, distinct-Capsule spread, replayed or expired ticket misuse, and live pending-ticket concurrency. It produces only `not-high`, `high`, or unavailable at the policy boundary.
- The accepted issuer must exactly match the configured V1 provider. Each internal assessment records its issuer, ruleset, evaluation and expiration times, decision, and restricted reason category; it expires after 60 seconds and is recomputed rather than treated as durable entitlement.
- Authorization records only the minimal account, registered device, Capsule binding, event type, and timestamp needed by the enforced rules. Ordinary denial reasons, IP addresses, user agents, Host origins, interaction telemetry, raw tickets, proofs, policies, and trust evidence are absent.
- Redemption rechecks the current ruleset while the account is locked, preventing a burst of concurrently issued tickets from bypassing the gate. Only known replayed and expired tickets contribute to misuse; limit, consent, account-state, and risk denials do not recursively worsen the assessment.
- Automated tests lock every exact threshold, rolling-window boundary, account isolation, issuer rejection, rule order, assessment freshness, authorization recording, redemption recheck, privacy schema, 30-day pruning, and account-deletion cascade.
- The local control-plane migrations applied without resetting development data. The full gate passes with 244 TypeScript tests and 210 PHP tests / 1,079 assertions.

Phase 5 privacy-safe denial evidence recorded on 2026-06-21:

- One closed PHP `CtxErrorCode` enum and the provider-neutral TypeScript CTX contract lock the exact 17 V1 public codes. Authorization and broker release responses contain only the versioned code, retry hint, and optional opaque correlation identifier permitted by the protocol—never free-form server detail, identity, score, threshold, history, credential, proof, key, or exception.
- The authenticated broker-to-control-plane redemption client validates the exact internal response shape, code, and status. It preserves reviewed account, device, limit, policy, risk, expiry, and replay outcomes for the trusted Viewer; unknown, malformed, or status-mismatched responses collapse to retryable temporary unavailability.
- Ticket validation and Viewer device-proof validation now have separate typed failures, allowing `invalid_ticket` and `invalid_proof` to remain actionable without exposing cryptographic detail. A replayed or expired valid ticket is likewise distinguished so the Viewer can start a fresh authorization rather than replaying the same material.
- The browser-extension library maps every closed-world code to reviewed Viewer-only categories, explanations, and actions. Automation-risk language states that no human-identity judgment is made and discloses no count, threshold, history, global identifier, or raw reason.
- A separate Host projection reduces all Viewer denials to only `locked`, `unavailable`, or `unsupported`; automated tests prove that no protocol code, title, explanation, action, or Viewer detail crosses that boundary.
- Creator analytics continue to receive only the seven coarse aggregate categories (`eligibility`, `consent`, `limit`, `risk`, `policy`, `ticket`, and `availability`). Exhaustive tests map every V1 code without copying a raw code or viewer identity into the creator projection.
- The full gate passes with 249 TypeScript tests and 241 PHP tests / 1,143 assertions. Every Phase 5 implementation task is complete; the deferred unpacked-extension integration exercise remains a later end-to-end acceptance gate after the Viewer shell exists, not unfinished Phase 5 implementation.

Deferred extension integration gate:

- After the Viewer extension shell exists, complete `_docs/operations/viewer-key-release-integration-test.md` using the actual unpacked extension identity and local control-plane/broker runtimes. This is a later end-to-end acceptance test, not a Phase 5 completion gate. Phase 5 remains independently verifiable through automated protocol, broker, concurrency, and runtime tests.

### Phase 6 — Creator Studio and local Capsule creation

Objective: let a creator produce a valid Capsule without sending plaintext or creator signing keys to Laravel.

- ✅ Build the authenticated Laravel Capsule-creation page for descriptive metadata, embedded policy, and extension handoff.
- ✅ Explain supported formats, limits, policy consequences, hosting requirements, extension requirement, and residual screenshot/capture risk.
- ✅ Build the Creator Studio surface inside the extension or an extension-controlled page.
- ✅ Generate the creator Ed25519 signing key locally and support multiple signing-key records and status.
- ✅ Require an encrypted recovery bundle and independently generated high-entropy recovery code before first publication.
- ✅ Validate actual JPEG, PNG, or WebP structure, reject animation/active formats, and enforce every V1 image limit before packaging.
- ✅ Generate a fresh random AES content key and nonce for each protected payload.
- ✅ Register the content key with the configured broker without exposing it to the Laravel page.
- ✅ Build canonical metadata and policy, encrypt the image, sign the manifest, and assemble the exact `.capsule` ZIP layout locally.
- ✅ Immediately re-open and verify the produced Capsule with the same strict reader before download.
- ✅ Present copyable `<capsule-viewer>` integration instructions, compatible Host requirements, and public fallback guidance.
- ✅ Provide a Capsule inventory with status, identifiers, policy summary, release counts, revocation, and account-deletion impact.
- ✅ Build the per-Capsule operational metrics dashboard for committed-release totals and time buckets, authorization and safe denial aggregates, global limit status, and thresholded per-account limit pressure with visible freshness, retention, and suppression explanations.
- ✅ Keep country, device class, browser/OS family, and Viewer-version analytics outside V1 while preserving a versioned optional-dimensions boundary that collects nothing without later consent and privacy approval.

Phase 6 completion hardening — reopened 2026-06-22:

- ✅ Add a durable creator-owned Capsule-revision registry with immutable Capsule, revision, payload, broker, release-handle, policy-digest, canonical policy-summary, creation, and ownership bindings; registration grants, authorization tickets, counters, and metrics are not substitutes for this source of truth.
- ✅ Make the registry lifecycle authoritative with explicit `pending`, `active`, `revocation_pending`, `revoked`, `cleanup_pending`, and `destroyed` semantics; authorization and inventory must fail closed whenever the authoritative state is not active, and metrics must never determine lifecycle state.
- ✅ Change broker key registration to create a bounded pending, non-releasable record; activate it only after the extension has assembled and strictly re-opened the exact Capsule and completed an idempotent finalization operation.
- ✅ Add idempotent cancellation, expiry, and retryable cleanup for incomplete or abandoned builds so broker-held content keys cannot remain indefinitely orphaned after signing, packaging, verification, transport, or local-download failure.
- ✅ Drive inventory, policy summaries, metrics limit status, revocation, account closure, permanent deletion, and deletion-ledger recovery from the durable registry while preserving authoritative committed-release counters and creator-ownership checks.
- ✅ Suppress per-account limit-pressure output by default until its cohort and pressure thresholds complete privacy review; then expose only versioned, configured, tested aggregate rules rather than controller literals.
- ✅ Add failure-path, retry, concurrency, ownership, cleanup, closure/deletion, backup-replay, and metrics-independence tests; update the production change ledger for the registry migration, broker pending/finalization contract, cleanup schedule, verification, and rollback boundary.

Phase 6 completion-hardening evidence recorded on 2026-06-22:

- `creator_capsules` is the creator-owned source of truth for immutable revision bindings, canonical policy summaries, and the closed lifecycle. Release-binding checks and atomic redemption require an exact active registry record; pending, revocation-pending, revoked, cleanup-pending, destroyed, missing, or mismatched records fail closed without consulting metrics for lifecycle state.
- Broker registrations begin pending and non-releasable. The Creator builder finalizes only after signing, exact ZIP assembly, and strict local re-open verification; local failures and ambiguous finalization responses request cancellation of either pending or newly active material, and the five-minute cleanup command retries expired or incomplete destruction.
- Inventory, limits, revocation, closure, deletion, and restored-backup deletion replay use registry ownership. Authoritative committed-release counters remain separate. Per-account pressure is neither computed nor rendered while privacy review is incomplete, even if an obsolete feature flag is supplied.
- Failure, idempotency, expiry, ownership, revocation-race, cleanup-retry, deletion rollback, restored-backup replay, and registry/metrics-independence tests lock the design intent. The full gate passes with 362 TypeScript tests and 273 PHP tests / 1,339 assertions.

Success goals:

- Network inspection confirms creator plaintext, signing private keys, recovery codes, and unwrapped content keys never reach Laravel.
- Produced Capsules pass shared fixtures and fail if any signed byte or encrypted entry changes.
- A creator can download a Capsule and obtain complete static-host integration instructions.

Phase 6 Creator Studio entry evidence recorded on 2026-06-21:

- The verified-account-only Creator Studio prepares a required Title, one optional public Description reused as initial suggested fallback accessibility text, and the four optional V1 creator policy choices without asking creators to author protocol predicates. When Description is blank, Title supplies the minimal fallback text.
- The page contains no file input, server submission, creator private-key field, recovery-code field, or content-key field. It explicitly assigns source selection, key use, encryption, signing, and packaging to the connected extension.
- A versioned DOM handoff emits only the reviewed draft fields as a JSON string. Blank numeric fields omit that limit; configured limits must be positive safe JSON integers, and zero is never an unlimited sentinel. Either scope may be used independently; when both are present, Creator Studio requires the shared total to be at least the per-viewer-account value.
- Automated feature tests lock authentication, email verification, V1 policy language, extension handoff markers, and the absence of a server content form. TypeScript tests lock the closed draft shape, trimming, optional-gate behavior, and limit boundaries.
- The full gate passes with 257 TypeScript tests and 244 PHP tests / 1,169 assertions.

Phase 6 Creator Studio guidance evidence recorded on 2026-06-21:

- The creation page leads with the nontechnical compatibility facts: JPEG, PNG, or WebP and an approximately 26 MB maximum. An optional details disclosure preserves the exact provisional V1 envelope—25 MiB encoded size, 16,384 pixels per dimension, and 40,000,000 decoded pixels—and rejection of SVG, GIF, APNG, animated WebP, active, and unrecognized content. Every limit remains enforced before packaging.
- Policy guidance distinguishes committed content-key releases from page loads, denied requests, and proof of human attention; explains exact-revision lifetime limits and the account-not-person boundary; and describes automation risk without identity, personhood, or intent claims.
- The extension explanation names every local-only operation and rejects server upload or secret custody as a compatibility fallback. Adjacent risk language states that authorized screenshots, recordings, cameras, modified browsers, and post-render copying remain possible.
- Publishing guidance captures the compatible Host boundary: HTTPS, unauthenticated GET, recommended HEAD, public noncredentialed CORS, immutable revision URLs, public fallback content, and no required database, SDK, account system, CTX logic, broker integration, cookies, or range support.
- Feature tests lock every required explanation to the Creator Studio surface. The full gate passes with 257 TypeScript tests and 245 PHP tests / 1,191 assertions.

Phase 6 creator-selected access-window evidence recorded on 2026-06-21:

- The accepted V1 policy now includes one optional canonical `ctx.time.capsule-access-window` requirement with `not_before`, `not_after`, or both. Instants are exact whole-second UTC values; the opening boundary is inclusive, the closing boundary is exclusive, and malformed, empty, equal, reversed, offset, or noncanonical values fail closed.
- Creator Studio accepts blank, start-only, end-only, and bounded calendar dates in the creator's browser time zone. A start date maps to local midnight at its beginning; a closing date remains usable for the whole selected day and maps to the following local midnight. The handoff contains only the corresponding exact UTC instants.
- The PHP policy parser independently reproduces the shared TypeScript contract. Authorization checks current provider time before ticket issuance; the private ticket mapping persists both boundaries; atomic redemption checks them again before any counter increment or key release.
- `2026_06_21_094000_add_access_window_to_ctx_authorization_tickets.php` was applied locally without resetting development data. The production change ledger records the pending migration, coordinated contract deployment, clock-monitoring dependency, verification, and recovery requirements.
- Exact tests cover omitted and one-sided windows, canonical ordering, invalid dates and instants, start inclusion, end exclusion, ticket persistence, redemption recheck, local-date conversion, and Creator Studio explanations. The full gate passes with 269 TypeScript tests and 250 PHP tests / 1,225 assertions.

Phase 6 extension-owned Creator Studio evidence recorded on 2026-06-21:

- The browser-extension package now owns a dedicated Creator Studio page, plain-language draft review, accessible local file chooser, and responsive extension-origin styling. It clearly states that the original remains on the creator's computer and presents only supported type and approximate file-size guidance at the selection point.
- A strict closed-shape parser accepts only the reviewed V1 public handoff. Unknown fields, private-material fields, unsupported versions, mismatched fallback text, invalid limits, and invalid access windows fail closed before the local surface starts.
- The surface controller retains the browser `File` object as opaque local state. Its renderer receives only file name, byte length, and reported media type, and automated tests prove that source bytes cannot enter the rendered view model.
- The page exposes an explicit mounting boundary for the future Manifest V3 runtime. Draft transport and extension identity remain Phase 7 shell responsibilities; source validation, key generation, encryption, signing, and packaging remain the following Phase 6 tasks rather than being implied by file selection.
- The full gate passes with 279 TypeScript tests and 250 PHP tests / 1,231 assertions.

Phase 6 creator signing-key evidence recorded on 2026-06-21:

- The browser extension generates purpose-bound Ed25519 signing keys locally through WebCrypto, derives the exact 32-byte canonical public value, assigns an opaque manifest-compatible identifier, and stores the private `CryptoKey` only in creator-scoped IndexedDB. Creator Studio receives public summaries and never receives or renders the private key.
- The key ring supports multiple versioned records with a closed `active`, `retiring`, `revoked`, and `expired` lifecycle. Adding a replacement atomically retires every prior active record; signing requires exactly one active record; terminal records cannot be reactivated.
- Creator Studio shows the active signing identity and prior record statuses in plain language and can create a replacement. It explains that account recovery cannot restore the signing identity and that encrypted recovery material is required before first publication.
- Private keys remain exportable solely for the immediately following encrypted-recovery-bundle workflow. Raw private bytes are not persisted, rendered, logged, or transmitted, and publication gating remains the next Phase 6 task.
- The full gate passes with 284 TypeScript tests and 250 PHP tests / 1,231 assertions.

Phase 6 creator signing-key recovery evidence recorded on 2026-06-21:

- Creator tooling generates an independent 256-bit recovery code, 128-bit salt, and 96-bit nonce with separate cryptographic-random requests. HKDF-SHA-256 derives a non-extractable AES-256-GCM key; the strict versioned bundle authenticates its key identity, public key, creation time, KDF parameters, and encryption parameters as canonical additional data.
- The downloadable bundle contains only public bindings and authenticated ciphertext. It contains neither the recovery code nor an unencrypted private key; temporary PKCS #8, plaintext, and code byte arrays are overwritten on a best-effort basis after use and never enter Laravel or ordinary network paths.
- Recovery rejects malformed codes, unknown fields, unsupported versions, changed headers, wrong codes, ciphertext tampering, invalid plaintext, and public/private key mismatch. Successful recovery proves the Ed25519 key pair matches before returning restored signing authority.
- New signing keys remain recovery-required. Creator Studio downloads the encrypted bundle, displays the separate code, requires explicit confirmation that both were saved separately, and only then makes the active key eligible for future publication. Restored keys are recovery-confirmed after possession of both items is proven.
- The manual save-and-restore exercise remains deferred until the complete Capsule creation pipeline can prove the restored key by signing and verifying a real Capsule; the recovery contract is independently covered by automated round-trip and failure tests now.
- The full gate passes with 297 TypeScript tests and 250 PHP tests / 1,231 assertions.

Phase 6 creator content-profile validation evidence recorded on 2026-06-21:

- The browser extension now defines the generic `CreatorContentProfile<TMetadata>` boundary agreed for future content types. Inspection receives an abstract byte source and returns either immutable normalized metadata or reviewed structured issues; generic Creator Studio code contains no image-format parsing or media-type branches.
- The trusted creator-profile registry maps the exact static-image identifier/version to its implementation. Adding another reviewed content type requires its own creator inspector and registry entry, while the current format `1.0` manifest remains the explicitly image-specific compatibility slice.
- Static-image inspection determines JPEG, PNG, and WebP from actual bytes rather than filename or browser MIME hints. It validates PNG chunks and CRCs, supported JPEG frames and scan boundaries, and simple or extended lossy/lossless WebP RIFF structures; it rejects GIF, SVG, APNG, animated WebP, multi-picture JPEG, unsupported encodings, malformed lengths, bad checksums, truncation, and trailing data.
- The encoded limit is enforced before reading when possible and again against actual bytes. Width, height, pixel count, and nominal RGBA memory limits are all enforced before decode. The isolated browser decoder must succeed with orientation transforms disabled and report the exact parsed dimensions before the source and normalized signed metadata are retained.
- Focused tests cover each accepted format and WebP variant, palette PNG, animation and active-format rejection, structural corruption, exact boundaries, every over-limit outcome, read/size/decode failures, decoder mismatch, immutability, registry resolution, and Creator Studio refusal to retain invalid sources.
- The full gate passes with 317 TypeScript tests and 250 PHP tests / 1,231 assertions.

Phase 6 creator payload-secret evidence recorded on 2026-06-21:

- Capsule Core remains the authority for exact 32-byte AES-256 content keys and 12-byte GCM nonces. The extension now creates one payload-scoped secret handle with two independent secure-random requests for every protected payload rather than exposing generation calls throughout the future builder.
- The handle returns nonce copies and grants serialized, callback-scoped access to a temporary content-key copy for broker registration and encryption. Concurrent access fails closed; callback completion or failure overwrites its working copy; explicit idempotent destruction overwrites retained key and nonce bytes and rejects all later use.
- Factory construction defensively copies generated material and overwrites the original generation buffers. Capsule Core now also overwrites a partially filled key or nonce buffer if the secure random source throws, ensuring every caller inherits the same failure cleanup.
- Tests lock exact request sizes and independence across payloads, defensive-copy behavior, sequential broker/encryption access, concurrent-access rejection, temporary-copy erasure, idempotent destruction, post-destruction failure, partial-randomness cleanup, and the existing AES-256-GCM vectors and authenticated payload contract.
- The full gate passes with 323 TypeScript tests and 250 PHP tests / 1,231 assertions.

Phase 6 creator broker-registration evidence recorded on 2026-06-21:

- The extension registration client uses the active device's DPoP-bound `capsule:create` token to send Laravel only the stable registration identity, Capsule/payload/policy bindings, and SHA-256 content-key digest. The exact control-plane request shape has no `content_key` field.
- A strict no-store 60-second grant must name the configured broker exactly. The extension then sends the grant and temporary raw-key encoding directly to that broker's `/registrations` endpoint with omitted credentials; Laravel never proxies or receives the raw key.
- Registration identities are generated once outside the network operation and remain stable across accepted idempotent retry. Broker success accepts only the exact versioned response and opaque 32-byte release handle; unexpected fields, origins, lifetimes, cacheability, statuses, encodings, tokens, scopes, bindings, proofs, and transport failures fail closed.
- Payload-secret callback scoping overwrites the temporary digest and broker key copies after each stage. Tests inspect both captured requests to prove that only the digest crosses the Laravel boundary while the raw key travels only to the configured broker.
- The full gate passes with 332 TypeScript tests and 250 PHP tests / 1,231 assertions.

Phase 6 local Capsule assembly evidence recorded on 2026-06-21:

- The extension-owned builder turns the reviewed Creator Studio draft and validated static-image metadata into the exact canonical V1 policy, payload authenticated-data context, manifest, detached Ed25519 signature, and three-entry `.capsule` archive entirely in local memory.
- The original source bytes are encrypted with the payload-scoped AES-256-GCM key before broker registration. The resulting release handle and broker identity are signed into the manifest; the raw content key, source bytes, signing private key, and recovery material never enter the Laravel page or control-plane request.
- The shared Capsule Core ZIP writer emits only `manifest.json`, raw 64-byte `manifest.sig`, and the ID-derived encrypted payload path. It validates the manifest, payload commitment, signature representation, and exact archive allowlist before writing a deterministic stored ZIP without ZIP64, comments, data descriptors, or filesystem extraction.
- Publication fails before source access unless the active signing key has confirmed recovery. Every success and failure path overwrites the local plaintext buffer and destroys the payload-secret handle; broker failures collapse to a reviewed builder error without leaking transport detail.
- Automated tests decrypt the produced ciphertext under its manifest-derived authenticated context, verify the manifest signature and broker/policy bindings, inspect the archive entry contract, and cover omitted policy gates, recovery gating, changed-source rejection, broker failure, and secret cleanup. The full gate passes with 337 TypeScript tests and 250 PHP tests / 1,231 assertions.

Phase 6 immediate Capsule verification evidence recorded on 2026-06-21:

- Capsule Core now owns one bounded, in-memory V1 ZIP reader used by both creator self-verification and future Viewer parsing. The Creator builder reopens the final emitted bytes through that reader before returning a downloadable result; successful construction alone is not publication success.
- The reader requires one single-disk, comment-free central directory and exactly three stored entries. It rejects encryption flags, compression, data descriptors, extra fields, ZIP64-scale values, duplicate names, gaps, overlaps, trailing data, unsafe UTF-8 names, local/central disagreement, CRC mismatch, and archives over the bounded V1 envelope without filesystem extraction.
- `manifest.json` must be exact canonical UTF-8 bytes, which also prevents permissive JSON parsing from hiding duplicate keys or insignificant alternate serialization. The strict manifest/schema/policy/profile contracts, exact entry allowlist, signed ciphertext length and SHA-256 commitment, raw signature representation, and Ed25519 signature are all verified before the archive is accepted.
- Tamper tests cover payload mutation, invalid signatures, ZIP encryption and compression flags, extra fields, comments, truncation, and name/header disagreement. The full gate passes with 346 TypeScript tests and 250 PHP tests / 1,231 assertions.

Phase 6 Host-integration guidance evidence recorded on 2026-06-21:

- Creator Studio now turns a permanent public HTTPS Capsule URL and the draft's suggested fallback text into copyable, escaped `<capsule-viewer>` markup. URL validation rejects HTTP, credentials, queries, fragments, relative locations, padding, and oversized input so generated examples do not normalize credential-bearing or temporary links into publication guidance.
- Suggested fallback is ordinary public child content, remains editable outside the signed Capsule, and is safely HTML-escaped. The surface explicitly asks creators to test without the extension rather than treating fallback as private, signed, or guaranteed to be replaced.
- The checklist states the complete minimum Host contract in plain language: immutable HTTPS bytes, anonymous GET, public noncredentialed CORS, accepted media types, recommended HEAD, and useful child fallback. It also makes clear that the Host needs no Share Capsules account, SDK, database, content key, or server-side decryption.
- Copy uses the browser clipboard from a user action when available and falls back to selecting the complete readonly markup for keyboard copy. Automated tests lock exact output, escaping, and unsafe URL/fallback rejection. The full gate passes with 359 TypeScript tests and 250 PHP tests / 1,231 assertions.

Phase 6 inventory, operational metrics, and analytics-boundary evidence recorded on 2026-06-21:

- The authenticated Creator Studio inventory now derives ownership from successfully redeemed broker registration grants and lists exact Capsule/revision, payload and registration identifiers, policy fingerprint, active/revoked status, registration time, and committed-opening total. The same repository powers the account-closure/recovery export, eliminating the prior empty placeholder.
- Permanent revocation requires verified ownership and recent password confirmation, calls the creator-scoped broker lifecycle, and projects an idempotent revocation metric. The UI plainly explains irreversibility, hosted encrypted-file behavior, closure pausing, permanent key destruction, and the need to retain local Capsule and signing-recovery files.
- The creator-scoped operational dashboard shows Capsule totals, authorization aggregates, safe denial categories, up to 24 recent hourly buckets, known global-limit progress, freshness, detail-retention guidance, and per-account limit pressure only after a five-account cohort threshold. It exposes no account identifiers or individual histories; cross-account inventory, metrics, and revocation access return not found.
- The versioned metric envelope retains `optional_dimensions` as an exact empty object/array boundary. Event, storage, and projection tests explicitly prohibit country, device class, browser/OS family, Viewer version, IP address, user agent, viewer device, proof, ticket, key, and account identifiers. Adding any later dimension still requires separate purpose, consent, retention, suppression, and privacy approval.
- The final complete gate passes with 359 TypeScript tests and 253 PHP tests / 1,258 assertions.

Phase 6 hardening audit recorded on 2026-06-22:

- The existing implementation and test evidence remain useful, but Phase 6 is reopened. Redeemed registration grants are temporary protocol artifacts, metrics are non-authoritative projections, and authorization tickets are short-lived decisions; none is an acceptable durable Capsule lifecycle or policy source of truth.
- A successful broker registration currently precedes manifest signing and final archive verification. Until pending registration, finalization, and cleanup compensation exist, a later local failure can leave broker-held key material for a Capsule that was never delivered.
- The extension-owned Creator components remain independently tested but are not yet connected through the Manifest V3 runtime to one user-visible build-and-download operation. That connection is an explicit first Phase 7 integration task after Phase 6 hardening, not evidence that the current components already form an end-to-end UI.
- The current five-account and eighty-percent pressure values have not completed the privacy review required by the accepted metrics design. Phase 6 hardening must suppress this output until an approved versioned rule replaces implementation literals.

### Phase 7 — Viewer extension and `<capsule-viewer>` integration

Objective: securely discover, authorize, decrypt, validate, and render protected images on approved Hosts.

- ⬜️ Connect the hardened Creator Studio components through the Manifest V3 runtime into one authenticated select, validate, recover, encrypt, register, finalize, strictly verify, download, and integration-guidance flow; complete the deferred real-Capsule signing-key recovery exercise before treating Creator creation as user-viable.
- ✅ Create the Chrome Manifest V3 extension with only the accepted required permissions and runtime HTTPS-origin grants.
- ✅ Use separate production and development extension identities and OAuth registrations.
- ✅ Discover explicit `<capsule-viewer>` elements only on user-approved top-level origins.
- ✅ Preserve Host-provided child content as public fallback and never treat it as signed Capsule metadata.
- ✅ Insert an extension-origin iframe or full-page extension Viewer so Host scripts cannot read Viewer DOM, keys, or plaintext.
- ✅ Fetch Capsules anonymously under the compatible Host contract with bounded redirects, lengths, reads, and timeouts.
- ✅ Parse ZIP and manifest data with no filesystem extraction and verify the signature, schema, policy, suite, hashes, profile, and provider identities before disclosure or authorization.
- ✅ Implement account connection, device registration, disclosure consent, and site-scoped standing consent.
- ⬜️ Support locked, individual-open, deliberate open-all, and lazy automatic opening near the viewport after standing consent.
- ⬜️ Prevent hidden elements and unusual bulk pages from silently consuming releases.
- ✅ Request CTX authorization, present the ticket and device proof to the broker, and unwrap the content key through V1 HPKE.
- ✅ Decrypt only in extension-controlled memory, validate actual image bytes and limits, render through the trusted image profile, and dispose of plaintext/key references on close.
- ⬜️ Require fresh online authorization on reload or reopen; persist no plaintext or content key in ordinary storage or cache.
- ⬜️ Implement accessible loading, consent, denial, revocation, device-limit, unsupported-profile, network, and security-failure states.
- ⬜️ Implement the no-extension install/onboarding link with safe return state and no credentials or tokens in URLs.

Phase 7 Creator-runtime implementation evidence recorded on 2026-06-22:

- Creator output now uses a deterministic `share-capsules/<account-folder>/` boundary beneath a parent directory explicitly selected through the browser. The account folder is derived from the signed-in account label when available, avoiding an extra `workspaces/workspace-*` layer in the user-visible file tree. The extension retains the granted handle in IndexedDB and rechecks write permission while keeping structural directory names fixed. A muted setup area runs after account connection to repair or create `workspace.json` and the exact encrypted recovery bundle before the main creation controls are enabled; the separate recovery code is shown only when a fresh recovery bundle must be confirmed and is never retained or written into the workspace. Changing locations repairs the complete structure in the new parent. The main creation area then groups the signed Capsule details, source-file selection, Capsule filename, and verified create-and-save action.
- New Capsule registrations project the public title, content-profile identity/version, and media type into the creator-owned Laravel inventory. Cards lead with a human name and content format while technical identifiers remain disclosed on demand; an ownership-scoped management label can rename the account view without changing signed Capsule bytes. Existing rows remain valid and render explicit legacy fallbacks. A creator may retain a revoked Capsule for operational history or delete one revision; deletion fails closed, destroys only that revision's broker-held key, removes it from inventory, and retains a terminal lifecycle tombstone for cleanup and audit safety.
- The authenticated Laravel management surfaces share one responsive account shell with Dashboard, Capsules, Account, and Sign out navigation. Dashboard summarizes Capsule and account state, Capsule inventory exposes a prominent New Capsule action, and each page identifies the active destination without changing its security or protocol boundary.

- The reproducible unpacked build contains a Manifest V3 service worker, a narrowly matched local Creator handoff script, and an extension-owned Creator Studio bundle. The one-use handoff retains only the bounded public draft in `storage.session`; replay, unknown fields, wrong sender paths, and malformed request identifiers fail closed.
- The extension page now connects through OAuth Authorization Code with PKCE, registers non-exportable device keys, obtains a DPoP `capsule:create` session, validates the selected file through the trusted content-profile registry, requires a confirmed or restored creator signing key, builds and strictly reopens the exact archive, finalizes the broker registration, and downloads only that verified result. Build or download failure attempts cancellation so pending or newly active key material does not become an abandoned usable registration.
- The fixed development manifest public key produces extension ID `dhconceamghcnndjodjhjikknblhkmej`; local OAuth configuration was provisioned for its exact Chromium callback. Production configuration retains a distinct placeholder identity and callback. Automated tests lock the development ID, packaged-code CSP, exact automatic localhost origins, optional HTTPS grants, and reviewed permissions.
- The full non-browser gate passes with 378 TypeScript tests and 273 PHP tests / 1,339 assertions. `npm run build` now also produces the loadable extension bundle. The first Phase 7 task remains open until `_docs/operations/phase7-creator-runtime-manual-test.md` proves a real build, recovery restore, matching signing identity, and negative recovery-code behavior in the unpacked browser runtime.

Phase 7 Viewer-discovery evidence recorded on 2026-06-23:

- The extension now packages a Viewer discovery content script without adding an install-time all-sites static content script. The service worker dynamically registers the script for HTTPS Host origins and localhost development origins; Chrome host grants still determine where it can run.
- The discovery script runs only in the top-level document, finds explicit `<capsule-viewer>` elements, resolves and validates each `src`, rejects public HTTP and credential-bearing Capsule URLs, preserves Host fallback children, and hands valid discoveries to the extension-frame boundary. It does not fetch Capsules, request authorization, expose account/device data, or treat fallback content as signed metadata.
- Automated tests lock the URL boundary and Manifest V3 permission shape, including required `scripting`, reviewed localhost development exceptions, and the absence of a broad static `https://*/*` content script.

Phase 7 Viewer-frame evidence recorded on 2026-06-23:

- Detected Host elements now receive a packaged extension-origin Viewer iframe instead of a Host-readable status box. The iframe receives only the resolved Capsule URL and starts from a locked placeholder state before later Viewer steps run.
- The Host fallback children remain ordinary public page content. Host scripts can observe iframe placement and the public Capsule URL already declared in the element, but they cannot read future Viewer DOM, keys, plaintext, account state, tickets, or authorization results from the extension-origin frame.
- The manifest exposes only `viewer-frame.html`, `viewer-frame.css`, and `viewer-frame.js` as web-accessible Viewer assets. Creator Studio remains non-web-accessible, and automated tests lock the frame URL and web-accessible-resource boundary.

Phase 7 Viewer-fetch evidence recorded on 2026-06-23:

- The extension frame now performs the first anonymous Capsule fetch with `credentials: omit`, `cache: no-store`, `referrerPolicy: no-referrer`, and manual redirect handling. No account tokens, CTX credentials, tickets, device proofs, or Host fallback content are sent to the Capsule URL.
- Fetch policy revalidates the initial URL and every redirect target, rejects URL userinfo, rejects public HTTP, permits localhost HTTP only for the development example Host, and rejects common loopback, link-local, private-network, and local-name targets on HTTPS.
- Fetching is bounded by explicit redirect, response-length, streamed-read, and timeout limits. The frame only reports coarse locked/fetched/failure state; ZIP parsing, manifest validation, authorization, key release, decryption, and rendering remain separate Phase 7 tasks.

Phase 7 Viewer-verification evidence recorded on 2026-06-23:

- Fetched Capsule bytes are now passed directly from extension memory into the strict V1 ZIP verifier with no filesystem extraction. The verifier accepts only the expected stored archive shape, canonical `manifest.json`, raw `manifest.sig`, and declared encrypted payload entry.
- Verification now covers the manifest schema, canonical JSON, creator Ed25519 signature, CTX policy shape, supported cryptographic suite, static-image content profile declaration, encrypted-payload length, and SHA-256 payload commitment before any account connection, disclosure, CTX authorization, key release, decryption, or rendering.
- The Viewer-facing wrapper returns only a minimal signed summary and encrypted payload bytes on success. It fails closed on invalid archives, invalid manifests, invalid signatures, size excess, and optional exact-match CTX issuer or broker trust-list failures.

Phase 7 Viewer-account and consent evidence recorded on 2026-06-23:

- The extension frame now receives the Host site origin along with the public Capsule URL, so standing consent can be scoped to the embedding site rather than inferred from the Capsule file location.
- Viewer account connection uses the existing OAuth Authorization Code with PKCE and device-registration machinery, but stores a separate Viewer credential under Viewer-specific storage keys. Viewer sessions require `ctx:authorize` and reject `capsule:create`, preserving the Creator/Viewer permission split.
- If no active Viewer session exists, the verified frame presents a Connect account action that registers or reauthorizes the local Viewer device without exposing tokens, device private keys, account identifiers, tickets, or privileged results to the Host page.
- After account connection, the frame presents disclosure consent for view-event accounting and policy evaluation before authorization. Optional standing consent is stored only for the normalized Host site origin, exact CTX issuer identity, and exact signed policy digest. One-time approval is held only in the current frame state.
- This step still stops before CTX authorization, ticket issuance, broker redemption, HPKE content-key release, decryption, or rendering; no committed opening is consumed by connection or consent alone.

Phase 7 Viewer-authorization evidence recorded on 2026-06-23:

- After verification, account connection, and consent, the extension frame now requests a CTX authorization ticket using the Viewer DPoP session and registered device proof key. The request body is constructed from the verified signed Capsule data: broker, Capsule identifier and revision, embedded policy, policy digest, payload identifier, release handle, render action, cryptographic suite, and view-event consent.
- Viewer authorization rejects non-DPoP sessions and sessions that include `capsule:create`, preserving role separation. Requests send the access token only to the CTX endpoint with a fresh DPoP proof; authorization tickets and denial details remain inside the extension frame and are never sent to Host page scripts.
- The frame stops after ticket issuance and reports that broker redemption comes next. This substep still does not redeem the ticket, unwrap a content key, decrypt payload bytes, render plaintext, or persist a ticket/content key across reloads.

Phase 7 Viewer-redemption evidence recorded on 2026-06-23:

- After ticket issuance, the extension frame now sends the exact ticket, a fresh `ctx-key-release-proof+jwt` signed by the registered Viewer proof key, and the registered X25519 agreement public key directly to the signed broker `/releases` endpoint. No OAuth token, browser cookie, Host data, or plaintext is sent to the broker.
- The Viewer validates that the ticket claims exactly match the verified Capsule, signed policy digest, issuer, broker, payload, release handle, action, suite, and current Viewer proof/agreement keys before any broker request. Local development loopback identities are accepted only for this development path; production HTTPS identities remain the expected deployment shape.
- The broker response is accepted only as the strict V1 key-release envelope for the same ticket and suite. The extension unwraps the returned content key in memory with a browser-native HPKE open implementation for the fixed V1 suite, covered by focused browser-key tests without bundling runtime code generation into the Manifest V3 extension.

Phase 7 Viewer-decryption and render evidence recorded on 2026-06-23:

- After broker key release, the extension frame decrypts the signed encrypted payload in extension-controlled memory using the verified manifest-derived AES-GCM associated data and nonce. The released content key is zeroed after use and is not placed in ordinary extension storage, page storage, Host DOM, or URLs.
- The decrypted plaintext is revalidated through the trusted static-image profile implementation before display. The Viewer compares actual decoded file structure, media type, encoded size, dimensions, and pixel count against the signed manifest declaration, then fails closed if those facts diverge.
- Successful opens render a local object URL inside the extension-origin frame, update the state to `Capsule opened`, and revoke the object URL on replacement or frame close. Focused tests cover successful decrypt/render, authentication failure, profile rejection, plaintext/key zeroing, and object URL disposal.
- The opened Viewer state now favors protected content over protocol chrome. Routine Viewer branding, status text, and Capsule URLs are hidden from the visible opened result, while accessible status remains present for assistive technology. `<capsule-viewer debug>` enables safe console diagnostics for troubleshooting without logging tokens, tickets, proofs, keys, plaintext, recovery data, or account identifiers.
- Broker redemption failures now preserve reviewed public CTX denial codes inside the extension frame and map them to safe user-facing messages for stale/invalid tickets, invalid device proof, unavailable release, Capsule/account opening limits, policy failures, automation protection, temporary service failures, and HTTP rate limiting. Unknown denial codes still fail closed as invalid responses.
- Viewer account connection is now shared across same-page Viewer frames. A frame waiting at Connect observes the shared Viewer credential update in extension storage and resumes its own verified authorization flow when another Capsule completes connection, avoiding a per-Capsule Connect click while keeping authorization and key release Capsule-specific.
- Broker provider-signing-key lookup now caches successful CTX JWKS responses briefly and reports fetch or malformed-provider responses as retryable temporary unavailability. Actual ticket/key mismatches still fail closed as invalid tickets, but local multi-Capsule refresh timing no longer collapses transient verifier dependency failures into misleading ticket errors.
- Same-page Viewer frames now enter a shared extension queue before online authorization, broker key release, decryption, and rendering. Shared connection can still wake every frame, but only one Capsule opening pipeline runs at a time, preventing localhost single-worker deadlocks and creating the future control point for open-all and lazy automatic opening limits.
- Opened Viewer presentation is content-first and borderless inside the extension frame. The accepted Host authoring direction is `<capsule-viewer>` with optional `<fallback>`, `<template>`, and `<error>` top-level children. The Host uses ordinary page markup and CSS in `<template>`, while a nested `<content>` placeholder is replaced by the extension-origin iframe. Classes and inline styles on the placeholder style only the iframe shell; decrypted content remains inside the cross-origin extension frame. The current implementation's `fit="contain|cover|fill|full-height|scale-down"` and `viewer-height` attributes remain compatible presentation controls while the structured markup contract matures.
- The structured Host markup contract now has its first runtime path. Viewer frames start hidden while routine loading, verification, authorization, broker release, and decryption are underway. The Host fallback remains visible until user action, safe error presentation, or opened content is ready. On success, the content script activates the Host `<template>`, substitutes verified public metadata as text, and moves the extension-origin iframe into the first `<content>` placeholder so surrounding Host CSS can style the page while decrypted content remains isolated.

Success goals:

- A hostile Host cannot directly read the extension frame's plaintext, DOM, account identifier, credentials, tickets, or keys.
- Hidden or ineligible elements do not consume a committed release.
- Successful opens render only after complete verification and atomic broker redemption.
- Unsupported browsers and absent extensions retain public fallback content without server-side decryption.

### Phase 8 — Static reference Host and end-to-end scenario

Objective: prove separation of concerns using an ordinary static website rather than a Share Capsules hosting feature.

- ⬜️ Create a static HTTPS-compatible example containing several `<capsule-viewer>` elements on one page.
- ⬜️ Include useful accessible fallback content between each element's opening and closing tags.
- ⬜️ Host Capsule files with anonymous GET, optional HEAD, accepted media type, public CORS, immutable revision URLs, and bounded content lengths.
- ⬜️ Include examples with no optional gates, opening and closing date boundaries, a Capsule-global lifetime limit, a per-account lifetime limit, and the automation-risk gate.
- ⬜️ Demonstrate individual opening, open-all consent, lazy automatic opening, denial, limit exhaustion, revocation, and no-extension behavior.
- ⬜️ Verify separately hosted page and Capsule origins require and respect distinct runtime Host permissions.
- ⬜️ Document deployment to at least one representative static Host without requiring its accounts, cookies, server code, or plugins.

Success goals:

- The unmodified static Host can serve multiple independently protected Capsules.
- Replacing Share Capsules with protocol-compatible discovery identities remains structurally possible.
- The reference page demonstrates the complete creator-to-viewer flow without Share Capsules storing content.

### Phase 9 — Security, privacy, and compatibility hardening

Objective: satisfy the documented threat model and prove that privacy promises are implemented rather than aspirational.

- ⬜️ Convert every applicable V1 threat-model release gate into an automated test, operational check, or documented manual review.
- ⬜️ Fuzz ZIP, JSON, manifest, policy, image metadata, JWT, DPoP, HPKE, redirect, and error parsers.
- ⬜️ Test path traversal, duplicate entries, ZIP bombs, decompression limits, integer boundaries, malformed images, animation, and decoder failures.
- ⬜️ Test OAuth mix-up, callback mismatch, token theft, replay, device revocation, recovery abuse, and concurrent redemption.
- ⬜️ Verify logs and error responses contain no plaintext, secret keys, recovery codes, content keys, reusable credentials, or raw trust histories.
- ⬜️ Test Capsule metric idempotency, committed-release semantics, low-volume suppression, creator ownership checks, aggregate retention, and the absence of viewer identifiers or deferred audience dimensions from creator projections.
- ⬜️ Implement automated retention jobs for 24-hour replay artifacts, 30-day CTX/risk detail, 90-day security audits, 90-day maximum sanction tombstones, and 30-day backup expiration.
- ⬜️ Test account closure, permanent deletion, broker-key destruction, counter disposal, backup restoration, and deletion-ledger replay.
- ⬜️ Produce privacy controls for consent inspection, revocation, data export, correction, and appeal.
- ⬜️ Run the provisional image envelope on representative supported Chrome/Chromium desktops and finalize or reduce it before freezing the V1 profile.
- ⬜️ Define browser/version support and reject known vulnerable Viewer releases through provider policy.
- ⬜️ Run dependency, secret, static-analysis, and reproducible-extension-build checks.
- ⬜️ Enable private vulnerability reporting and configure dependency updates, secret scanning, dependency review, and appropriate code scanning for the public repository.
- ⬜️ Perform an independent security review of cryptographic bindings, broker isolation, extension boundaries, and privacy lifecycle before public release.

Success goals:

- All applicable threat-model gates have evidence and an owner.
- Retention and deletion tests prove data leaves active systems and restored backups on schedule.
- The finalized image profile is stable on the published minimum desktop configuration.
- No unresolved critical or high-severity security finding remains at release.

### Phase 10 — Deployment, distribution, and MVP release

Objective: operate the complete system with controlled identities, monitoring, documentation, and rollback paths.

- ⬜️ Confirm that the release candidate provides a coherent user-visible capability and explicitly approve production deployment; phase completion alone does not trigger a deployment.
- ⬜️ Reconcile the existing production environment against the production configuration template and record the sanitized baseline in the production change ledger.
- ⬜️ Deploy Laravel, MySQL, Redis, queues, scheduler, and the isolated broker with separate production identities and least privilege.
- ⬜️ Record every production environment-variable name, migration, infrastructure or identity change, deployment action, verification result, and rollback consideration without committing secret values.
- ⬜️ Configure TLS, security headers, secret management, KMS/HSM-backed broker protection, backups, deletion-ledger restoration, and alerting.
- ⬜️ Publish stable provider and broker discovery metadata and controlled signing-key rotation procedures.
- ⬜️ Build the extension without remotely hosted code, publish source/build hashes, and submit the fixed production identity to the Chrome Web Store.
- ⬜️ Publish creator, viewer, privacy, security-limit, account-deletion, and compatible-Host documentation.
- ⬜️ Publish the project README, Apache License 2.0 notice, sponsorship/contact statement, contribution guide, governance guidance, code of conduct, security policy, and issue/pull-request templates.
- ⬜️ Audit the complete public working tree and history for secrets, local data, logs, generated artifacts, unrelated private information, and third-party licensing obligations.
- ⬜️ Configure the public GitHub repository, Discussions, protected primary branch, required CI, and private vulnerability-reporting path.
- ⬜️ Publish the static reference Host and downloadable example Capsules.
- ⬜️ Run clean-account creator and viewer acceptance tests against production-like infrastructure.
- ⬜️ Run load and concurrency tests for authorization, redemption, counters, and broker operations at the intended MVP scale.
- ⬜️ Exercise incident response, signing-key rotation, extension-version suspension, Capsule revocation, backup restoration, and rollback procedures.
- ⬜️ Record release evidence and explicitly approve the MVP against the release criteria below.

Success goals:

- A new creator and viewer can complete the end-to-end scenario using published instructions and the store-distributed extension.
- Production boundaries match the tested topology; no development identity or credential is accepted.
- Monitoring detects authorization, broker, queue, retention, and security failures without collecting prohibited telemetry.

## MVP Release Criteria

The operational MVP may be released only when:

- All Phase 1–10 success goals are met and required tasks are marked complete.
- One creator can produce, independently host, revoke, and inspect a valid static-image Capsule.
- Multiple Capsules on one static page can be opened under individual or site-scoped standing consent.
- Embedded policy, global/per-account limits, optional automation risk, ticket replay prevention, and atomic redemption behave correctly under concurrency.
- The Viewer performs all plaintext decryption and rendering locally in the extension-controlled boundary.
- Account/device revocation and the full closure/deletion lifecycle have verified behavior.
- The threat-model release gates and provisional image benchmarks have recorded evidence.
- User-facing language accurately describes risk reduction and never promises copy prevention, human certainty, or one-human-one-account.

## Open Questions, Risks, and Follow-On Work

The following do not block planning but may require implementation evidence or later design work:

- Chrome Web Store review timing and policies may affect distribution sequencing.
- Managed KMS/HSM product selection is replaceable but must satisfy the accepted broker boundary.
- Representative desktop benchmarks may reduce the provisional image limits before the V1 profile is finalized.
- Browser-managed memory cannot guarantee physical zeroization; the implementation can provide only best-effort lifecycle containment.
- Share Capsules operates both CTX and the broker in V1, so V1 is not cryptographic zero access.
- Modified browsers, screenshots, external capture, and authorized-human misuse remain residual risks.
- Public development increases useful review and contribution but does not make the hosted service trustless or the experimental MVP suitable for highly sensitive content.
- The Apache License 2.0 copyright notice, third-party compatibility, contributor expectations, and any trademark policy require TekFoundry confirmation before the first public release.
- Federation, independent/split-key brokers, provider migration, additional content profiles, mobile/cross-browser Viewers, adaptive renditions, chunking, and stronger personhood remain future work activated by concrete demand or security evidence.

## Lessons

- Containerized Composer, npm, Artisan, builds, and tests are authoritative; host runtimes can select incompatible native dependencies even when their reported major versions appear suitable.
- Named dependency volumes must be refreshed when their lockfile changes. The app bootstrap records the `package-lock.json` hash and runs `npm ci` when the mounted volume is stale.
- Docker Desktop may be installed without its CLI directory on the shell PATH. Project tooling should resolve the bundled CLI and add its credential helpers to PATH rather than assuming `docker` is globally linked.
- Containerized Vite must distinguish its internal bind address from the browser-facing origin and HMR port. Emitting `0.0.0.0:<container-port>` into Laravel pages produces an unstyled page even though Vite itself is healthy.
- Health endpoints should be registered outside the web middleware group so orchestration probes do not create sessions, CSRF state, or cookies.
- CI-oriented container commands should use non-interactive `docker compose exec -T`; inherited pseudo-terminals can keep an unattended aggregate check open after the child command finishes.
- Workspace consumer tests resolve package exports from compiled `dist` output, so TypeScript compilation must complete before those tests run; launching build and consumer tests concurrently can exercise stale exports.
