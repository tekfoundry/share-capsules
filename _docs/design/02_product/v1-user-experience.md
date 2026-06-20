# V1 Creator and Viewer Experience

Status: Draft
Last updated: 2026-06-19

## Purpose

Define the simple user-facing V1 experience while preserving the internal Capsule and CTX role boundaries needed for security and future interoperability.

## Product invariant

Protocol flexibility must not become ordinary user complexity.

Share Capsules presents one product, one account, and one coherent workflow even though it implements logically distinct CTX Provider, Trust Provider, and Key Broker roles. Those distinctions remain machine-readable and independently secured without requiring creators or viewers to configure service topology.

## Creator experience

The normal V1 creator flow is:

1. Create and verify one Share Capsules account.
2. Install and connect the Share Capsules browser extension.
3. Open Creator Studio.
4. Select supported local content.
5. Configure understandable access rules, including optional Capsule-global limit, per-account limit, and automation-risk gate.
6. Create and export the `.capsule` file locally.
7. Copy generated `<capsule-viewer>` markup and fallback content.
8. Upload the Capsule, fallback assets, and page to a creator-selected Host.

The creator does not manually enter CTX issuer URLs, signing keys, broker endpoints, trust-provider identifiers, cryptographic suites, release handles, or protocol versions.

Behind the interface, trusted tooling selects the configured Share Capsules service roles, registers the protected content key with the broker, records accepted assertion issuers, constructs the manifest, and signs the result with the creator-controlled key.

## Viewer experience

The normal V1 viewer flow is:

1. Install the Share Capsules extension when first encountering protected content.
2. Create or connect one Share Capsules account and verify email.
3. Grant site permission and choose whether eligible Capsules may open automatically on that site.
4. Review and approve required CTX disclosure when standing consent does not already cover it.
5. View authorized content inline or open it in the full-page Viewer.

The viewer sees product language such as “Connect Share Capsules,” “Access requirements,” and “View limit reached.” They are not asked to understand JWTs, CTX issuer metadata, HPKE, device-key roles, broker audiences, or internal service boundaries.

When the extension is absent, the fallback link opens a Share Capsules install and onboarding page. Supported users are directed to the official Chrome Web Store listing and can resume the original Capsule after installation and account connection. Unsupported browsers retain public fallback content and receive an honest compatibility explanation; V1 does not offer lower-assurance protected viewing silently.

## Hidden complexity and transparency

Hiding routine complexity does not mean concealing security behavior. The product must clearly explain access requirements, information use, consent, counting, automatic opening, failures, and provider identity at the level needed for an informed decision.

Advanced technical details may expose:

- Capsule and policy versions
- Creator signing identity
- CTX issuer
- Accepted assertion issuers
- Key Broker identity
- Cryptographic suite
- Capsule, payload, and policy identifiers

These details are available for inspection, debugging, audits, and interoperability without interrupting the ordinary workflow.

## V1 provider configuration

V1 has no provider-selection interface. Share Capsules tooling uses one preconfigured service bundle containing:

- Share Capsules as account and CTX Provider
- Share Capsules as the V1 automation-risk Trust Provider
- The isolated Share Capsules Key Broker

The signed Capsule still records the distinct machine identities and bindings required to prevent substitution and support future portability.

Future advanced tooling may let creators choose compatible CTX Providers, Trust Providers, or Key Brokers. Adding that choice should not require changing existing Capsule concepts or forcing ordinary users to manage multiple accounts when providers support delegated coordination.

The Laravel Creator Studio may prepare documentation or draft settings without the extension, but production Capsule creation requires the extension for local file handling, signing-key use, encryption, packaging, and export.

## Related documents

- [System overview](../03_architecture/system-overview.md)
- [End-to-end access and data flow](../03_architecture/access-and-data-flow.md)
- [Share Capsules reference implementation](../03_architecture/share-capsules-reference-implementation.md)
- [Capsule design intent](../04_capsule/design-intent.md)
- [CTX design intent](../05_ctx/design-intent.md)
- [Viewer fallback and assurance](../06_viewer/fallback-and-assurance.md)
