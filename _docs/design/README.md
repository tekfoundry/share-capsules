# Share Capsules Design Documentation

Status: Living documentation
Last updated: 2026-06-20

## Purpose

This documentation captures the evolving design intent for Share Capsules, the Capsule format, the Capsule Trust Exchange (CTX), and trusted Viewers.

Share Capsules is the hosted product, first CTX Provider, and reference implementation at `sharecapsules.com`. Capsule is the portable encrypted content format. CTX is the open protocol for presenting creator-selected trust evidence and obtaining authorization. Other compatible CTX Providers may operate independently in the future. The system is intended to let content be distributed publicly without becoming universally accessible.

These documents are living design records. They describe current direction, rationale, uncertainties, and rejected simplifications. They are not yet normative protocol specifications.

## Recommended reading order

1. [Vision and problem](01_foundations/vision-and-problem.md)
2. [Design principles](01_foundations/principles.md)
3. [Scope and non-goals](01_foundations/scope-and-non-goals.md)
4. [Terminology](01_foundations/terminology.md)
5. [Open source and sponsorship](01_foundations/open-source-and-sponsorship.md)
6. [V1 creator and viewer experience](02_product/v1-user-experience.md)
7. [Visual design](02_product/visual-design.md)
8. [System overview](03_architecture/system-overview.md)
9. [Accounts and identity](03_architecture/accounts-and-identity.md)
10. [Key management](03_architecture/key-management.md)
11. [End-to-end Capsule access and data flow](03_architecture/access-and-data-flow.md)
12. [Compatible Host contract](03_architecture/compatible-host.md)
13. [Share Capsules reference implementation](03_architecture/share-capsules-reference-implementation.md)
14. [CTX trust model](05_ctx/trust-model.md)
15. [V1 trust profile and retained state](05_ctx/trust-profile-v1.md)
16. [CTX policy model](05_ctx/policy-model.md)
17. [CTX authorization and key release](05_ctx/authorization-and-key-release.md)
18. [V1 automation risk](05_ctx/automation-risk.md)
19. [Reputation and signals](05_ctx/reputation-and-signals.md)
20. [Human confidence](05_ctx/human-confidence.md)
21. [Browser Viewer](06_viewer/browser-viewer.md)
22. [Viewer content profiles](06_viewer/content-profiles.md)
23. [Viewer fallback and assurance](06_viewer/fallback-and-assurance.md)
24. [Privacy model](07_security-and-privacy/privacy-model.md)
25. [Identity and device verification](07_security-and-privacy/identity-and-device-verification.md)
26. [V1 threat model](07_security-and-privacy/threat-model-v1.md)
27. [V1 cryptographic suite](07_security-and-privacy/cryptographic-suite-v1.md)
28. [Open questions](09_planning/open-questions.md)
29. [Capsule Manifest V1 specification](10_specifications/capsule/manifest-v1.md)

## Documentation structure

```text
_docs/design/
├── README.md
├── 01_foundations/             Durable vision, principles, language, and boundaries
├── 02_product/                 Actors, use cases, and creator/viewer experiences
├── 03_architecture/            System composition, data flows, and trust boundaries
├── 04_capsule/                 Capsule-specific design intent
├── 05_ctx/                     Trust, policy, reputation, and authorization intent
├── 06_viewer/                  Browser, native viewer, and telemetry intent
├── 07_security-and-privacy/    Threats, privacy, abuse resistance, and data governance
├── 08_decisions/               Architecture Decision Records (ADRs)
├── 09_planning/                V1 scope, roadmap, and unresolved questions
└── 10_specifications/          Future normative Capsule, CTX, and Viewer specifications
```

Directories may initially be empty. New documents should be created when a topic has enough substance to maintain independently; the project should avoid placeholder documents that merely repeat this index.

## Document conventions

Each design document should identify:

- Its status and last update date
- Its purpose
- Current design intent
- Accepted or provisional decisions
- Important rationale
- Open questions
- Related documents

The following status labels are used:

- **Draft** — active exploration; substantial change is expected.
- **Provisional** — preferred direction, pending validation or dependent decisions.
- **Accepted** — current project intent; changes should include explicit rationale.

Git history provides document version history. Version numbers should not be embedded in filenames.

## Design intent and specifications

Design documents explain why the system exists and why particular directions are preferred. They may contain examples, but those examples are not automatically protocol requirements.

Normative specifications will eventually define interoperable behavior using terms such as `MUST`, `SHOULD`, and `MAY`. Until those specifications exist, Share Capsules and other implementations are reference experiments rather than conforming Capsule or CTX implementations.
