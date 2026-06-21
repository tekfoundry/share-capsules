# Initial Share Capsules MVP

Status: In progress
Last updated: 2026-06-20

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
- ⬜️ Create a living technical-overview page covering Capsule and CTX terminology, architecture, cryptographic boundaries, trust and privacy, provider independence, V1 limitations, and links to the detailed design documents.
- ⬜️ Clearly distinguish the long-term vision, implemented capabilities, active development, and deferred work on every page where readers could otherwise infer production readiness.
- ⬜️ Add visible TekFoundry sponsorship, `info@tekfoundry.com`, open-source participation, GitHub, and feedback calls to action without presenting TekFoundry as the only possible future CTX Provider.
- ⬜️ Add page titles, descriptions, canonical URLs, social-sharing metadata and image, semantic landmarks, keyboard support, reduced-motion behavior, and responsive layouts.
- ⬜️ Add automated page, content, metadata, link, accessibility-smoke, and responsive-layout tests that lock down important public claims without making ordinary copy edits brittle.
- ⬜️ Perform a manual review on representative desktop and mobile sizes for clarity, accessibility, visual hierarchy, broken links, and accidental security or readiness overclaims.

Success goals:

- A creator unfamiliar with the project can identify the problem, proposed approach, current status, and next action from the front page.
- The workflow makes clear that Hosts serve encrypted files, CTX evaluates access, and protected content is decrypted only inside the trusted Viewer boundary.
- Technical readers can reach the architecture, privacy model, threat model, specifications, source, and feedback channel without searching the repository.
- Public language invites scrutiny and participation while accurately describing the MVP as software under active development.

### Phase 5 — Isolated broker and CTX authorization control plane

Objective: authorize exact Capsule releases without exposing raw content keys to the normal Laravel application.

- ⬜️ Implement provider discovery metadata, version negotiation, public signing keys, and controlled key rotation.
- ⬜️ Implement the broker as a separately deployable component with dedicated credentials, storage, API, and audit access.
- ⬜️ Define a KMS/HSM adapter and a local development implementation that preserves the production trust boundary.
- ⬜️ Register creator-provided content keys through an authenticated extension-to-broker flow and return opaque high-entropy release handles.
- ⬜️ Ensure normal Laravel application processes cannot retrieve raw broker wrapping keys or unwrapped content keys.
- ⬜️ Implement preliminary policy evaluation for verified email, active account, registered device, disclosure consent, limits, and optional automation risk.
- ⬜️ Issue 60-second, single-use, Ed25519-signed CTX JWT tickets with the exact type, audience, Capsule, revision, policy, payload, action, suite, and device-key bindings.
- ⬜️ Implement strict broker ticket validation, fresh device proof, and HPKE wrapping to the registered X25519 agreement key.
- ⬜️ Implement online ticket redemption with atomic replay prevention and global/per-account committed-release counter increments.
- ⬜️ Ensure an unredeemed ticket never counts and a committed release counts even if the final response is lost.
- ⬜️ Implement a versioned, provider-aware metrics event and idempotent projection model for authorization attempts, privacy-safe denials, and authoritative broker-committed releases without copying viewer identity or raw trust evidence into creator analytics.
- ⬜️ Implement Capsule and account revocation, paused creator releases during account closure, and broker-key destruction after permanent deletion.
- ⬜️ Implement V1 deterministic automation-risk rules using only CTX authorization and committed-release metadata.
- ⬜️ Expose privacy-safe denial categories to the Viewer while withholding global identity and raw history from creators and Hosts.

Success goals:

- Concurrent redemption tests cannot exceed global or per-account Capsule limits.
- Replayed, expired, mis-audienced, mis-bound, downgraded, or revoked tickets fail closed.
- The Laravel control plane cannot independently cause arbitrary content-key disclosure through ordinary credentials.
- Creators receive only allowed predicates and Capsule aggregates; Hosts receive no trust-profile data.

### Phase 6 — Creator Studio and local Capsule creation

Objective: let a creator produce a valid Capsule without sending plaintext or creator signing keys to Laravel.

- ⬜️ Build the authenticated Laravel Capsule-creation page for descriptive metadata, embedded policy, and extension handoff.
- ⬜️ Explain supported formats, limits, policy consequences, hosting requirements, extension requirement, and residual screenshot/capture risk.
- ⬜️ Build the Creator Studio surface inside the extension or an extension-controlled page.
- ⬜️ Generate the creator Ed25519 signing key locally and support multiple signing-key records and status.
- ⬜️ Require an encrypted recovery bundle and independently generated high-entropy recovery code before first publication.
- ⬜️ Validate actual JPEG, PNG, or WebP structure, reject animation/active formats, and enforce every V1 image limit before packaging.
- ⬜️ Generate a fresh random AES content key and nonce for each protected payload.
- ⬜️ Register the content key with the configured broker without exposing it to the Laravel page.
- ⬜️ Build canonical metadata and policy, encrypt the image, sign the manifest, and assemble the exact `.capsule` ZIP layout locally.
- ⬜️ Immediately re-open and verify the produced Capsule with the same strict reader before download.
- ⬜️ Present copyable `<capsule-viewer>` integration instructions, compatible Host requirements, and public fallback guidance.
- ⬜️ Provide a Capsule inventory with status, identifiers, policy summary, release counts, revocation, and account-deletion impact.
- ⬜️ Build the per-Capsule operational metrics dashboard for committed-release totals and time buckets, authorization and safe denial aggregates, global limit status, and thresholded per-account limit pressure with visible freshness, retention, and suppression explanations.
- ⬜️ Keep country, device class, browser/OS family, and Viewer-version analytics outside V1 while preserving a versioned optional-dimensions boundary that collects nothing without later consent and privacy approval.

Success goals:

- Network inspection confirms creator plaintext, signing private keys, recovery codes, and unwrapped content keys never reach Laravel.
- Produced Capsules pass shared fixtures and fail if any signed byte or encrypted entry changes.
- A creator can download a Capsule and obtain complete static-host integration instructions.

### Phase 7 — Viewer extension and `<capsule-viewer>` integration

Objective: securely discover, authorize, decrypt, validate, and render protected images on approved Hosts.

- ⬜️ Create the Chrome Manifest V3 extension with only the accepted required permissions and runtime HTTPS-origin grants.
- ⬜️ Use separate production and development extension identities and OAuth registrations.
- ⬜️ Discover explicit `<capsule-viewer>` elements only on user-approved top-level origins.
- ⬜️ Preserve Host-provided child content as public fallback and never treat it as signed Capsule metadata.
- ⬜️ Insert an extension-origin iframe or full-page extension Viewer so Host scripts cannot read Viewer DOM, keys, or plaintext.
- ⬜️ Fetch Capsules anonymously under the compatible Host contract with bounded redirects, lengths, reads, and timeouts.
- ⬜️ Parse ZIP and manifest data with no filesystem extraction and verify the signature, schema, policy, suite, hashes, profile, and provider identities before disclosure or authorization.
- ⬜️ Implement account connection, device registration, disclosure consent, and site-scoped standing consent.
- ⬜️ Support locked, individual-open, deliberate open-all, and lazy automatic opening near the viewport after standing consent.
- ⬜️ Prevent hidden elements and unusual bulk pages from silently consuming releases.
- ⬜️ Request CTX authorization, present the ticket and device proof to the broker, and unwrap the content key through V1 HPKE.
- ⬜️ Decrypt only in extension-controlled memory, validate actual image bytes and limits, render through the trusted image profile, and dispose of plaintext/key references on close.
- ⬜️ Require fresh online authorization on reload or reopen; persist no plaintext or content key in ordinary storage or cache.
- ⬜️ Implement accessible loading, consent, denial, revocation, device-limit, unsupported-profile, network, and security-failure states.
- ⬜️ Implement the no-extension install/onboarding link with safe return state and no credentials or tokens in URLs.

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
- ⬜️ Include examples with no optional limits, a Capsule-global lifetime limit, a per-account lifetime limit, and the automation-risk gate.
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

- ⬜️ Deploy Laravel, MySQL, Redis, queues, scheduler, and the isolated broker with separate production identities and least privilege.
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
