# Legacy Design Migration Inventory

Status: Completed migration record
Last updated: 2026-08-26

This record documents the completed migration from the retired design-document
model into the current knowledge-base model. The retired source tree has been
removed after review; current durable project knowledge now lives under this
KB.

## Coverage Summary

- Retired source Markdown files reviewed: 51
- Current KB Markdown files after migration: 66
- Inventory misses found during verification: 0
- Current navigation source: [Knowledge base README](README.md)
- Primary current-state rollups:
  - [Product overview](01-product/product-overview.md)
  - [V1 requirements](02-requirements/v1-requirements.md)
  - [System architecture](03-architecture/system-architecture.md)
  - [V1 contracts and specifications](03-architecture/v1-contracts-and-specifications.md)
  - [Security and privacy model](04-security/security-and-privacy.md)
  - [Verification strategy](05-quality/verification-strategy.md)
  - [Operations runbook](06-operations/operations-runbook.md)
  - [Decision records](07-decisions/README.md)
  - [Glossary](glossary.md)

## Current Homes By Topic

| Retired topic group | Current KB home | Notes |
| --- | --- | --- |
| Product foundations, principles, sponsorship, vision, UX, metrics, and visual direction | [Product](01-product/README.md) | Durable product facts are preserved as detailed topic pages and summarized in the product overview. |
| Scope, non-goals, compatible hosts, host markup, open questions, actors, workflows, constraints, and acceptance criteria | [Requirements](02-requirements/README.md) | Requirements now separate current MVP behavior from deferred or unresolved scope. |
| System overview, access and data flow, account and identity architecture, official network behavior, reference implementation, Capsule behavior, CTX behavior, Viewer behavior, and protocol contracts | [Architecture](03-architecture/README.md) | Architecture keeps detailed subsystem pages plus current-state rollups and specification pages. |
| Threat model, privacy model, cryptographic posture, key management, identity and device assurance, trust profile, reputation signals, human-confidence signals, and automation-risk controls | [Security](04-security/README.md) | Security facts are grouped by trust boundary, retained data, destructive operations, residual risk, and release gates. |
| Contract fixtures, cryptographic vectors, test levels, release checks, validation gaps, and regression risk | [Quality](05-quality/README.md) | Quality coverage links the KB contracts to executable fixture and verification evidence. |
| Local topology, build and release behavior, browser-extension operations, broker isolation, security review evidence, rollback, smoke checks, and incident validation | [Operations](06-operations/README.md) | Operations keeps detailed runbooks in the operations area and summarizes current behavior here. |
| Accepted architecture decisions and ADR authoring guidance | [Decisions](07-decisions/README.md) | Consequential decisions remain separate from current-state descriptive pages. |
| Shared terminology | [Glossary](glossary.md) | Project vocabulary was consolidated and updated for the implemented system. |

## Detailed Current Pages

Product pages:

- [Open source and sponsorship](01-product/open-source-and-sponsorship.md)
- [Principles](01-product/principles.md)
- [Vision and problem](01-product/vision-and-problem.md)
- [V1 user experience](01-product/v1-user-experience.md)
- [Capsule metrics dashboard](01-product/capsule-metrics-dashboard.md)
- [Visual design](01-product/visual-design.md)

Requirements pages:

- [Scope and non-goals](02-requirements/scope-and-non-goals.md)
- [Compatible Host contract](02-requirements/compatible-host-contract.md)
- [Viewer host markup](02-requirements/viewer-host-markup.md)
- [Open questions](02-requirements/open-questions.md)

Architecture pages:

- [System overview](03-architecture/system-overview.md)
- [Access and data flow](03-architecture/access-and-data-flow.md)
- [Accounts and identity](03-architecture/accounts-and-identity.md)
- [Official network and registry](03-architecture/official-network-and-registry.md)
- [Share Capsules reference implementation](03-architecture/share-capsules-reference-implementation.md)
- [Capsule design intent](03-architecture/capsule/design-intent.md)
- [Adaptive renditions](03-architecture/capsule/adaptive-renditions.md)
- [Chunking and large payloads](03-architecture/capsule/chunking-and-large-payloads.md)
- [CTX design intent](03-architecture/ctx/design-intent.md)
- [CTX authorization and key release](03-architecture/ctx/authorization-and-key-release.md)
- [CTX policy model](03-architecture/ctx/policy-model.md)
- [Viewer design intent](03-architecture/viewer/design-intent.md)
- [Browser Viewer](03-architecture/viewer/browser-viewer.md)
- [Content profiles](03-architecture/viewer/content-profiles.md)
- [Fallback and assurance](03-architecture/viewer/fallback-and-assurance.md)
- [Specifications](03-architecture/specifications/README.md)

Security pages:

- [Cryptographic suite V1](04-security/cryptographic-suite-v1.md)
- [Identity and device verification](04-security/identity-and-device-verification.md)
- [Key management](04-security/key-management.md)
- [Privacy model](04-security/privacy-model.md)
- [Threat model V1](04-security/threat-model-v1.md)
- [Trust model](04-security/trust-model.md)
- [Trust profile V1](04-security/trust-profile-v1.md)
- [Reputation and signals](04-security/reputation-and-signals.md)
- [Human confidence](04-security/human-confidence.md)
- [Automation risk](04-security/automation-risk.md)

Quality pages:

- [Capsule contract fixtures V1](05-quality/fixtures/capsule-contract-fixtures-v1.md)
- [Cryptographic vectors V1](05-quality/fixtures/cryptographic-vectors-v1.md)

Decision pages:

- [ADR-0001: Open Protocol With Official Network](07-decisions/ADR-0001-open-protocol-official-network.md)
- [ADR authoring guidance](07-decisions/adr-authoring.md)

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

## Verification Evidence

- Retired-source inventory check reported 51 reviewed source Markdown files
  and 0 inventory misses before deletion.
- Current Markdown link check reported 76 checked Markdown files with all
  relative links resolving.
- Live stale-reference scans were clean after excluding generated caches,
  dependencies, and deleted-source history.
- `git diff --check` passed.
- `npm run test:ts` passed with Node 24.9.0: 46 test files and 624 tests.
- PHP feature verification for the public technical source links could not run
  because the app container was restarting due to a Vite startup error
  involving `laravel-vite-plugin`.

## Residual Risk

The knowledge-base migration is complete from a documentation-coverage
standpoint. The only unresolved verification gap is the pre-existing app
container startup issue that blocked the PHP feature test.
