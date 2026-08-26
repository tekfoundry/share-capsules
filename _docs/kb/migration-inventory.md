# Legacy Design Migration Inventory

Status: Migration evidence
Last updated: 2026-08-26

This inventory accounts for every Markdown file under `_docs/design/` and maps
its durable facts into the new `_docs/kb/` knowledge-base model. The legacy
files are intentionally preserved until the developer explicitly approves
deletion.

## Migration Map

| Legacy file | KB destination | Notes |
| --- | --- | --- |
| `01_foundations/open-source-and-sponsorship.md` | `01-product/open-source-and-sponsorship.md`, plus rollups in `01-product/product-overview.md`, `04-security/security-and-privacy.md`, `06-operations/operations-runbook.md` | Sponsorship, public-development posture, license/trademark caution, public repository gate. |
| `01_foundations/principles.md` | `01-product/principles.md`, plus rollups in `01-product/product-overview.md`, `04-security/security-and-privacy.md`, `glossary.md` | Creator ownership, hosting independence, data minimization, contextual trust, honest limits. |
| `01_foundations/scope-and-non-goals.md` | `02-requirements/scope-and-non-goals.md`, plus rollups in `02-requirements/v1-requirements.md`, `01-product/product-overview.md` | In-scope behavior, V1 gallery scenario, priority content, non-goals, provisional boundaries. |
| `01_foundations/terminology.md` | `glossary.md` | Shared vocabulary migrated and updated for current implementation. |
| `01_foundations/vision-and-problem.md` | `01-product/vision-and-problem.md`, plus rollups in `01-product/product-overview.md`, `02-requirements/v1-requirements.md` | Problem, vision, security promise, ecosystem intent, open questions. |
| `02_product/capsule-metrics-dashboard.md` | `01-product/capsule-metrics-dashboard.md`, plus rollups in `01-product/product-overview.md`, `04-security/security-and-privacy.md`, `05-quality/verification-strategy.md` | Metrics semantics, privacy-safe projections, future analytics deferred. |
| `02_product/v1-user-experience.md` | `01-product/v1-user-experience.md`, plus rollups in `01-product/product-overview.md`, `02-requirements/v1-requirements.md` | Creator/viewer workflows, account shell, confirmation dialog, Studio copy, limits, extension requirement. |
| `02_product/visual-design.md` | `01-product/visual-design.md`, plus rollups in `01-product/product-overview.md`, `05-quality/verification-strategy.md` | UX principles, accessibility baseline, visual direction. |
| `03_architecture/access-and-data-flow.md` | `03-architecture/access-and-data-flow.md`, plus rollups in `03-architecture/system-architecture.md`, `04-security/security-and-privacy.md`, `02-requirements/v1-requirements.md` | Creation/viewing sequence, information boundaries, permissions, failure states. |
| `03_architecture/accounts-and-identity.md` | `03-architecture/accounts-and-identity.md`, plus rollups in `02-requirements/v1-requirements.md`, `03-architecture/system-architecture.md`, `04-security/security-and-privacy.md` | Account continuity, auth, device registration, closure/restoration/deletion, identifiers, optional assurance. |
| `03_architecture/compatible-host.md` | `02-requirements/compatible-host-contract.md`, plus rollups in `02-requirements/v1-requirements.md`, `03-architecture/system-architecture.md`, `04-security/security-and-privacy.md` | HTTPS Host contract, CORS/retrieval expectations, declarative integration, non-requirements. |
| `03_architecture/key-management.md` | `04-security/key-management.md`, plus rollups in `03-architecture/system-architecture.md`, `03-architecture/v1-contracts-and-specifications.md`, `04-security/security-and-privacy.md` | Key hierarchy, creator ownership, broker release, deletion, recovery. |
| `03_architecture/official-network-and-registry.md` | `03-architecture/official-network-and-registry.md`, plus rollups in `03-architecture/system-architecture.md`, `07-decisions/ADR-0001-open-protocol-official-network.md` | Official recognition, creation/viewer behavior, revocation, governance direction. |
| `03_architecture/share-capsules-reference-implementation.md` | `03-architecture/share-capsules-reference-implementation.md`, plus rollups in `03-architecture/system-architecture.md`, `06-operations/operations-runbook.md`, `02-requirements/v1-requirements.md` | Laravel, extension, package handling, static Host, showcase, key isolation. |
| `03_architecture/system-overview.md` | `03-architecture/system-overview.md`, plus rollups in `03-architecture/system-architecture.md`, `01-product/product-overview.md` | Components, conceptual flow, trust boundaries, centralized V1/open protocol. |
| `04_capsule/adaptive-renditions.md` | `03-architecture/capsule/adaptive-renditions.md`, plus rollups in `02-requirements/v1-requirements.md`, `03-architecture/system-architecture.md` | Deferred; future constraints recorded as non-goal/deferred architecture. |
| `04_capsule/chunking-and-large-payloads.md` | `03-architecture/capsule/chunking-and-large-payloads.md`, plus rollups in `02-requirements/v1-requirements.md`, `03-architecture/v1-contracts-and-specifications.md` | Whole-payload V1 current behavior; chunking deferred. |
| `04_capsule/design-intent.md` | `03-architecture/capsule/design-intent.md`, plus rollups in `03-architecture/system-architecture.md`, `03-architecture/v1-contracts-and-specifications.md`, `02-requirements/v1-requirements.md` | Capsule role, package representation, signing/encryption, versioning, portability. |
| `05_ctx/authorization-and-key-release.md` | `03-architecture/ctx/authorization-and-key-release.md`, plus rollups in `03-architecture/system-architecture.md`, `03-architecture/v1-contracts-and-specifications.md`, `04-security/security-and-privacy.md` | Ticket, metadata, online redemption, counting, security properties. |
| `05_ctx/automation-risk.md` | `04-security/automation-risk.md`, plus rollups in `04-security/security-and-privacy.md`, `02-requirements/v1-requirements.md`, `05-quality/verification-strategy.md` | V1 deterministic rules, evidence boundary, disclosure, retention, calibration gap. |
| `05_ctx/design-intent.md` | `03-architecture/ctx/design-intent.md`, plus rollups in `02-requirements/v1-requirements.md`, `03-architecture/system-architecture.md`, `01-product/product-overview.md` | CTX role, policy inputs, product patterns, versioned policies, deferred richer gates. |
| `05_ctx/human-confidence.md` | `04-security/human-confidence.md`, plus rollups in `04-security/security-and-privacy.md`, `02-requirements/v1-requirements.md` | Human confidence and challenge direction; richer passive/identity signals remain future work. |
| `05_ctx/policy-model.md` | `03-architecture/ctx/policy-model.md`, plus rollups in `03-architecture/v1-contracts-and-specifications.md`, `02-requirements/v1-requirements.md` | Policy representation, predicate semantics, evaluation, extensibility. |
| `05_ctx/reputation-and-signals.md` | `04-security/reputation-and-signals.md`, plus rollups in `04-security/security-and-privacy.md`, `01-product/product-overview.md` | Multidimensional trust, V1 evidence, consent, disclosure, anti-gaming principles. |
| `05_ctx/trust-model.md` | `04-security/trust-model.md`, plus rollups in `04-security/security-and-privacy.md`, `glossary.md`, `01-product/product-overview.md` | Observed facts/provider assertions/creator policy, scoped trust, continuity. |
| `05_ctx/trust-profile-v1.md` | `04-security/trust-profile-v1.md`, plus rollups in `04-security/security-and-privacy.md`, `03-architecture/system-architecture.md` | Retained state, disclosure matrix, deletion boundary, retention schedule. |
| `06_viewer/browser-viewer.md` | `03-architecture/viewer/browser-viewer.md`, plus rollups in `03-architecture/system-architecture.md`, `04-security/security-and-privacy.md`, `02-requirements/v1-requirements.md` | Extension responsibilities, presentation, storage, OAuth, permissions, fallback. |
| `06_viewer/content-profiles.md` | `03-architecture/viewer/content-profiles.md`, plus rollups in `03-architecture/v1-contracts-and-specifications.md`, `02-requirements/v1-requirements.md` | Trusted content-profile boundary and static-image profile. |
| `06_viewer/design-intent.md` | `03-architecture/viewer/design-intent.md`, plus rollups in `01-product/product-overview.md`, `03-architecture/system-architecture.md` | Viewer responsibility, browser direction, telemetry boundary, UX, future implementations. |
| `06_viewer/fallback-and-assurance.md` | `03-architecture/viewer/fallback-and-assurance.md`, plus rollups in `02-requirements/v1-requirements.md`, `04-security/security-and-privacy.md` | No-extension behavior, no Host JS/server fallback, official distribution, future web Viewer deferred. |
| `06_viewer/host-markup.md` | `02-requirements/viewer-host-markup.md`, plus rollups in `02-requirements/v1-requirements.md`, `03-architecture/system-architecture.md` | Declarative syntax, fallback/template/error placeholders, styling and error boundaries. |
| `07_security-and-privacy/cryptographic-suite-v1.md` | `04-security/cryptographic-suite-v1.md`, plus rollups in `03-architecture/v1-contracts-and-specifications.md`, `04-security/security-and-privacy.md` | V1 primitive set and downgrade boundary. |
| `07_security-and-privacy/identity-and-device-verification.md` | `04-security/identity-and-device-verification.md`, plus rollups in `04-security/security-and-privacy.md`, `02-requirements/v1-requirements.md` | Device binding, optional identity, retention/revocation, disclosure. |
| `07_security-and-privacy/privacy-model.md` | `04-security/privacy-model.md`, plus rollups in `04-security/security-and-privacy.md`, `01-product/product-overview.md` | Privacy objective, consent, data minimization, retention, controls. |
| `07_security-and-privacy/threat-model-v1.md` | `04-security/threat-model-v1.md`, plus rollups in `04-security/security-and-privacy.md`, `05-quality/verification-strategy.md` | Threat controls, accepted residual risks, release-security gates, review triggers. |
| `08_decisions/ADR-0001-open-protocol-official-network.md` | `07-decisions/ADR-0001-open-protocol-official-network.md` | Migrated as accepted decision. |
| `08_decisions/README.md` | `07-decisions/adr-authoring.md`, plus index coverage in `07-decisions/README.md` | Decision-record index and template moved to KB. |
| `09_planning/open-questions.md` | `02-requirements/open-questions.md`, plus rollups in `02-requirements/v1-requirements.md`, `03-architecture/system-architecture.md`, `04-security/security-and-privacy.md` | Current unresolved questions split into deferred scope and known gaps. |
| `10_specifications/README.md` | `03-architecture/specifications/README.md`, plus rollup in `03-architecture/v1-contracts-and-specifications.md` | Specification index retained under architecture and summarized in current contracts. |
| `10_specifications/capsule/creator-signing-key-recovery-v1.md` | `03-architecture/specifications/capsule/creator-signing-key-recovery-v1.md`, plus rollups in `03-architecture/v1-contracts-and-specifications.md`, `04-security/security-and-privacy.md` | Recovery code, bundle protection, publication gate. |
| `10_specifications/capsule/cryptographic-suite-v1.md` | `03-architecture/specifications/capsule/cryptographic-suite-v1.md`, plus rollup in `03-architecture/v1-contracts-and-specifications.md` | Suite identifier, primitive set, key separation, tests. |
| `10_specifications/capsule/entry-commitments-v1.md` | `03-architecture/specifications/capsule/entry-commitments-v1.md`, plus rollup in `03-architecture/v1-contracts-and-specifications.md` | Entry digest, manifest commitment, archive validation, failure behavior. |
| `10_specifications/capsule/manifest-signature-v1.md` | `03-architecture/specifications/capsule/manifest-signature-v1.md`, plus rollup in `03-architecture/v1-contracts-and-specifications.md` | Canonical signed content, Ed25519 binding, verification. |
| `10_specifications/capsule/manifest-v1.md` | `03-architecture/specifications/capsule/manifest-v1.md`, plus rollup in `03-architecture/v1-contracts-and-specifications.md` | Format version, identifiers, archive allowlist, validation, encodings. |
| `10_specifications/capsule/payload-encryption-v1.md` | `03-architecture/specifications/capsule/payload-encryption-v1.md`, plus rollup in `03-architecture/v1-contracts-and-specifications.md` | Key/nonce/tag, ciphertext, AAD, encrypt/decrypt procedures. |
| `10_specifications/capsule/static-image-profile-v1.md` | `03-architecture/specifications/capsule/static-image-profile-v1.md`, plus rollups in `03-architecture/v1-contracts-and-specifications.md`, `02-requirements/v1-requirements.md` | Static image profile identity, media types, signed metadata, envelope, validation stages. |
| `10_specifications/ctx/policy-v1.md` | `03-architecture/specifications/ctx/policy-v1.md`, plus rollups in `03-architecture/v1-contracts-and-specifications.md`, `02-requirements/v1-requirements.md` | Policy object, requirements, canonical digest, evaluation, extensibility. |
| `10_specifications/ctx/protocol-contracts-v1.md` | `03-architecture/specifications/ctx/protocol-contracts-v1.md`, plus rollups in `03-architecture/v1-contracts-and-specifications.md`, `04-security/security-and-privacy.md` | Discovery, ticket, DPoP/proof, HPKE delivery, error envelope. |
| `10_specifications/fixtures/capsule-contract-fixtures-v1.md` | `05-quality/fixtures/capsule-contract-fixtures-v1.md`, plus rollups in `05-quality/verification-strategy.md`, `03-architecture/v1-contracts-and-specifications.md` | Fixture catalog identity, mutations, classifications, cross-language use. |
| `10_specifications/fixtures/cryptographic-vectors-v1.md` | `05-quality/fixtures/cryptographic-vectors-v1.md`, plus rollups in `05-quality/verification-strategy.md`, `03-architecture/v1-contracts-and-specifications.md` | Vectors, test-only keys, covered operations, PHP/TypeScript use. |
| `README.md` | `README.md`, `migration-inventory.md`, area README files | Legacy design index preserved as review baseline; current navigation moved to KB. |

## Implementation Areas Inspected

- Laravel routes and bootstrap: `code/routes/web.php`, `code/routes/api.php`,
  `code/routes/broker.php`, `code/routes/broker-api.php`,
  `code/routes/console.php`, `code/bootstrap/app.php`,
  `code/bootstrap/broker.php`
- Service providers and configuration: `code/app/Providers/*`,
  `code/config/sharecapsules.php`
- Account, deletion, sanctions, sessions, OAuth, DPoP, Viewer device, Capsule
  registry, CTX, broker, showcase, support, and logging modules under
  `code/app/`
- Browser extension creator/viewer modules under
  `code/apps/browser-extension/src/`
- Shared TypeScript packages under `code/packages/`
- PHP, TypeScript, browser, and operational tests under `code/tests/` and
  `code/packages/test-fixtures/src/`
- Operations runbooks and release evidence under `_docs/operations/`

## Role Review Notes

- Product strategy: current docs emphasize experimental open protocol,
  reference implementation, creator value, and honest protection limits.
- Requirements: user stories, actors, workflows, constraints, non-goals, and
  acceptance criteria now live in `02-requirements`.
- Architecture: subsystem boundaries, runtime contracts, data flow, lifecycle
  models, and V1 contracts now live in `03-architecture`.
- Security: trust boundaries, secrets, permissions, destructive operations,
  source/package trust, retention, threat controls, and residual risks now live
  in `04-security`.
- Quality: test levels, release gates, manual checks, and validation gaps now
  live in `05-quality`.
- Documentation: KB indexes cover every area and preserve the legacy design
  tree as a review baseline.
- UX writing: docs use current product language and avoid overclaiming trust,
  humanity, copy prevention, or production readiness.

## Deletion Readiness

The `_docs/design/` tree is ready for developer review as a preserved baseline.
It should not be deleted until the developer confirms that this KB migration
captures the needed current-state knowledge.
