# System Overview

Status: Draft
Last updated: 2026-06-19

## Purpose

Describe the major system components, their responsibilities, and the current trust boundaries without prematurely specifying wire protocols.

## Components

### Capsule

A Capsule is a portable, creator-signed content package. It may include:

- Public metadata
- Encrypted protected content
- Creator-signed embedded access policy
- Explicit format version, Capsule revision, and cryptographic-suite identifier
- Creator signature and public-key information
- CTX service and trust-provider configuration

Possession of a Capsule does not imply authorization to decrypt it.

### Creator tooling

Local creator tooling packages content, generates a unique content key for each protected payload, encrypts the payload, defines access intent, and signs the Capsule with a creator-controlled signing key. Share Capsules and other CTX services do not receive the unencrypted creator signing key.

### Host

The Host stores and serves Capsules. It is intentionally outside the primary trust boundary.

In V1 a Host declares Capsule placement through `<capsule-viewer>` and supplies ordinary accessible fallback content. The extension may insert a cross-origin trusted Viewer frame at that location after site permission and consent.

A Host should not need to:

- Authenticate the viewer
- Receive trust credentials
- Evaluate CTX policy
- Receive decryption keys
- Receive plaintext protected content from the Viewer

Share Capsules does not operate general-purpose Capsule hosting in V1. A minimal static reference Host demonstrates the boundary and gives creators and implementers a deployable example.

### Trusted Viewer

The Viewer:

- Retrieves and opens Capsules
- Verifies creator signatures
- Displays verified signed metadata and Host-provided public fallback presentation
- Explains policy and disclosure requests
- Presents viewer-approved trust evidence
- Participates in CTX authorization
- Receives or derives decryption material
- Decrypts and renders protected content locally
- Collects session telemetry only when authorized

The preferred V1 Viewer is a desktop browser extension. It discovers explicit `<capsule-viewer>` elements on approved Host sites and inserts extension-origin inline frames. The Host supplies placement and a Capsule URL but cannot read the frame's keys or plaintext. A full-page extension view remains available when a clearer high-assurance boundary is desired. The extension owns separate device proof and agreement keys, consent, CTX interaction, local decryption, rendering, and authorized session telemetry.

### Share Capsules service

The practical V1 Share Capsules service may provide:

- Creator and viewer accounts
- Credential storage or synchronization
- Consent configuration
- Trust-profile calculation
- Policy evaluation
- Authorization
- Risk analysis and rate limiting
- Revocation
- Coordination with creator-selected key-release providers

The service is expected to be centralized initially, but protocol design should allow compatible operators later.

### Trust providers

Trust providers issue credentials or assertions, including:

- Community membership and standing
- Contribution history
- Subscription status
- Creator recognition
- Personhood or identity assurance
- Session or account risk

Creators choose which providers they accept.

## Conceptual access flow

1. A creator packages, encrypts, signs, and distributes a Capsule.
2. A Host serves a `<capsule-viewer>` element with a Capsule URL and public fallback.
3. On an approved site, the extension inserts a trusted inline frame, fetches the Capsule, and verifies it.
4. The Viewer explains the creator's access requirements.
5. The account holder selects what evidence to disclose.
6. The Share Capsules CTX service validates credentials, current signals, counters, and policy.
7. Questionable sessions may receive step-up verification.
8. A short-lived authorization bound to the Capsule and Viewer device-key set is issued when requirements are satisfied.
9. A creator-selected key-release provider wraps decryption material to the authorized Viewer agreement key.
10. The Viewer decrypts and renders content locally.
11. Consented activity may update relevant facts and reputation dimensions.

## Trust boundaries

### Inside the current trust boundary

- Creator signing and encryption tooling
- Trusted Viewer extension and its device proof/agreement key set
- Authorized CTX services involved in the decision
- Selected trust providers within the scope of their assertions
- Creator-selected key-release components within their stated role

### Outside or only conditionally trusted

- Capsule Hosts
- Surrounding host-page JavaScript
- Networks and intermediaries
- Unrecognized credential issuers
- Viewer-controlled operating environments
- The human recipient after content is rendered

The Viewer is trusted software running in an environment the user controls. This limits how strongly it can prevent content extraction and must be addressed in the threat model.

The accepted V1 threats, mitigations, residual risks, and release-security gates are defined in the [V1 threat model](../07_security-and-privacy/threat-model-v1.md).

## Centralized V1 and open protocol

Share Capsules is the initial centralized CTX Provider. Centralization can make account recovery, reputation continuity, policy evaluation, abuse detection, and key release tractable in V1. The design must not confuse this reference implementation with the protocol or make it permanently necessary.

The Share Capsules reference implementation uses Laravel for hosted account and CTX services and client-side TypeScript for creator-controlled Capsule cryptography, trusted Viewer behavior, and local plaintext processing.

Creators export encrypted Capsules for deployment to independent Hosts. The project supplies a static HTML reference Host rather than a managed storage service.

Long-term portability requires:

- Stable, open Capsule and CTX specifications
- Exportable creator content and policies
- Multiple acceptable trust providers
- Credential and account portability where feasible
- Provider discovery and key rotation
- No permanent dependence on one Viewer origin or API operator
- Discovery and selection of compatible CTX Providers
- Migration paths that do not require re-encrypting every Capsule where secure key rewrapping is possible

## Key unresolved architecture

- Which service makes the final authorization decision?
- Can policy evaluation occur locally, remotely, or both?
- What does the centralized Share Capsules operator learn about Capsule opens?
- How are per-creator pseudonyms reconciled with ecosystem-wide abuse limits?
- Which capabilities define lower-assurance web Viewers after V1?

## Related documents

- [Vision and problem](../01_foundations/vision-and-problem.md)
- [Accounts and identity](accounts-and-identity.md)
- [Key management](key-management.md)
- [Access and data flow](access-and-data-flow.md)
- [Share Capsules reference implementation](share-capsules-reference-implementation.md)
- [V1 threat model](../07_security-and-privacy/threat-model-v1.md)
- [Trust model](../05_ctx/trust-model.md)
- [Privacy model](../07_security-and-privacy/privacy-model.md)
- [Open questions](../09_planning/open-questions.md)
