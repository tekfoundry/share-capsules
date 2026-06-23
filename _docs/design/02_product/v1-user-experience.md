# V1 Creator and Viewer Experience

Status: Draft
Last updated: 2026-06-22

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
4. Provide a title, optionally describe the content, and select a supported local file.
5. Configure understandable access rules, including an optional opening/closing date range, Capsule-global limit, per-viewer-account limit, and automation-risk gate.
6. Create and export the `.capsule` file locally.
7. Copy generated `<capsule-viewer>` markup and fallback content.
8. Upload the Capsule, fallback assets, and page to a creator-selected Host.

Creator output is organized beneath `share-capsules/<account-folder>/`, where the account folder is a filesystem-safe label derived from the signed-in account email when available. During creation, the creator chooses the parent directory; routine creation keeps `workspace.json`, the exact encrypted signing-key recovery file, and the account workspace's `capsules/` directory together. The recovery code remains separate and must not be written into the workspace. The extension remembers the granted directory handle, rechecks permission, and recreates the complete support structure before writing to a newly selected location.

The ordinary extension page preserves the creator's simple mental model by separating setup from creation. After account connection, a muted workspace-and-recovery area checks the remembered workspace or asks the creator to choose the parent directory. It writes or repairs `workspace.json` and the encrypted recovery file before the main creation controls are enabled. If a fresh recovery bundle is needed, that area displays the separate recovery code and requires explicit confirmation that the code was saved outside the workspace. The main creation area then contains the signed Capsule details, source-file selection, Capsule filename, and create-and-save action. Low-level workspace naming is not presented as a routine creation decision.

When extension-local recovery-bundle storage is missing but the remembered writable workspace still contains the exact encrypted recovery file, the extension validates and restores that bundle automatically before publication. This repair does not restore or expose the separate recovery code and does not weaken the requirement that creator signing recovery be confirmed before a Capsule can be published.

If the current browser still holds the active signing private key but the selected workspace is empty, the extension creates a fresh encrypted recovery bundle for that same signing identity, writes it into the workspace, displays a new separate recovery code, and requires explicit confirmation that the code was saved before enabling publication. If the browser already has a valid encrypted recovery bundle and the creator changes workspaces, the extension copies that recovery bundle into the new workspace before enabling publication. Setup status must name any one-time requirement and bring it into view; it must never remain indefinitely at a generic preparation message.

The creator does not manually enter CTX issuer URLs, signing keys, broker endpoints, trust-provider identifiers, cryptographic suites, release handles, or protocol versions.

Behind the interface, trusted tooling selects the configured Share Capsules service roles, registers the protected content key with the broker, records accepted assertion issuers, constructs the manifest, and signs the result with the creator-controlled key.

The authenticated Capsule inventory leads with the creator-supplied public title and a plain-language content type/format. UUIDs, payload identifiers, policy digests, and content-profile identifiers remain available under technical details rather than serving as the primary label. A creator may set an account-only management label for organization; changing that label does not modify the signed Capsule. Legacy registry rows without display metadata use explicit unavailable fallbacks.

A creator may either revoke access while retaining the Capsule in their inventory or delete it from their account. Deletion immediately makes the registry fail closed, permanently destroys that Capsule revision's broker-held content key, and removes it from the visible inventory. Share Capsules retains only the terminal lifecycle record needed for reliable cleanup and audit; it cannot remove `.capsule` files already downloaded or uploaded elsewhere, but those encrypted copies can no longer be opened through the destroyed key.

Authenticated Laravel pages use one consistent account shell. On larger screens, a left sidebar provides Dashboard, Capsules, Account, and Sign out; smaller screens present the same destinations in a compact responsive navigation. Dashboard summarizes Capsule and account state, Capsules provides a prominent New Capsule action, and the active destination is visibly and semantically identified. This navigation organizes management tasks without exposing protocol implementation details.

Major status changes and destructive actions require a reusable confirmation dialog before the original form may submit. The dialog names the exact action, explains its immediate and irreversible effects in plain language, defaults focus to a safe cancellation path, closes without acting on Cancel, Escape, or backdrop dismissal, and preserves normal server-side authorization, recent-authentication, CSRF, validation, and throttling checks after confirmation.

Creator Studio asks for one optional public Description rather than separate general and accessibility descriptions. When supplied, it becomes signed descriptive metadata and the initial suggested accessibility text for generated Host fallback markup. When omitted, the Title supplies the minimal suggested fallback text. The Host fallback remains independently editable, public, and outside the Capsule signature.

Optional numeric limits use empty fields to mean that the creator selected no limit at that scope; zero is invalid rather than an unlimited sentinel. The reference Studio permits either limit independently and requires the shared total to be at least the per-viewer-account value when both are supplied. Routine copy describes these as Capsule openings, while a secondary explanation preserves the exact committed-key-release counting boundary and lost-response behavior.

The supported-file summary leads with only the file types and an approximately 26 MB maximum. Exact 25 MiB, dimension, decoded-pixel, animation, and structure constraints remain available as compatibility details and are still enforced before packaging. Future content profiles present their own relevant compatibility summary instead of inheriting image-specific copy.

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
