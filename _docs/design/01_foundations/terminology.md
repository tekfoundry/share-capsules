# Terminology

Status: Draft
Last updated: 2026-06-18

## Purpose

Provide a shared vocabulary. Definitions are conceptual and may become more precise in future specifications.

## Terms

### Share Capsules

The user-facing hosted product, first CTX Provider, and initial reference implementation operated at `sharecapsules.com`. Share Capsules provides accounts, creator tools, CTX services, and Viewer distribution without owning the open Capsule or CTX specifications.

### Capsule

A media-agnostic portable package containing signed public metadata, arbitrary encrypted protected content, an embedded creator-signed access policy, and authenticity information. V1 public previews are Host fallback content rather than embedded Capsule assets.

### Capsule Trust Exchange (CTX)

The protocol by which creator-selected trust evidence is requested, presented, evaluated, and converted into an access decision.

### CTX service

A hosted implementation of CTX credential presentation, policy, authorization, risk, or key-release capabilities. A service is an implementation, not the protocol itself.

### CTX Provider

An organization operating compatible account, policy-evaluation, authorization, or related CTX services. Share Capsules is the initial CTX Provider. Future creators and viewers may select other compatible providers.

### Share Capsules account

A persistent account with the Share Capsules service through which a viewer or creator manages credentials, consent, reputation continuity, recovery, and access interactions. Other CTX implementations may use different account and identity models.

### Creator

The person or organization that packages content, signs a Capsule, and selects its access policy.

### Viewer

Trusted software that opens Capsules, verifies signatures, obtains authorization, decrypts protected content, and renders it. Viewer may also refer to the person using that software when context is clear.

### Capsule Viewer element

The declarative `<capsule-viewer src="...">` Host element used by V1 to identify a Capsule location and provide Host-owned fallback, opened, and error layout. The target authoring syntax uses `<fallback>`, `<template>`, optional `<error>`, and a nested `<content>` placeholder. The element is not itself trusted with accounts, policy decisions, keys, or plaintext. An approved browser extension inserts an extension-origin rendering frame at the protected content placeholder.

### Host

A system that stores or distributes Capsules. Hosts are not presumed trusted with viewer credentials, decryption keys, or plaintext content.

### Trust provider

An entity that issues signed credentials or assertions used in CTX policy evaluation, such as a community, subscription service, personhood provider, or risk provider. A Trust Provider supplies evidence; a CTX Provider operates protocol services. One organization may perform both roles, but the roles remain distinct.

### Credential

A signed statement issued by a trust provider about an account, pseudonym, membership, status, qualification, or other attribute.

### Assertion

A provider's time-bound interpretation or statement, such as `automation_risk: low`. The distinction between credential and assertion may be refined later.

### Observable fact

A measured or verifiable event or aggregate, such as account age or the number of Capsule opens in a period, before policy interpretation.

### Trust profile

The multidimensional collection of credentials, facts, and derived assessments available to an account. It is not a single universal score.

### Human confidence

A bounded assessment that available evidence is consistent with a persistent human-controlled account or session. It is not proof of legal identity or benign intent.

### Personhood verification

A process intended to establish that an account corresponds to a distinct natural person. Its assurance depends on the provider and evidence used.

### Session telemetry

Consented measurements derived from activity during a protected Viewer session and, when separately authorized, relevant surrounding-page interaction.

### Step-up verification

An additional check requested when existing evidence is insufficient, such as a browser challenge, accessible interaction, credential presentation, or manual approval.

### Policy

Creator-authored requirements describing which evidence, providers, thresholds, limits, and decision rules govern access.

### Authorization

A bounded decision or token permitting a particular account or Viewer to access specified protected content under stated conditions.

### Creator signing key

A creator-controlled private key used to sign Capsule manifests and establish creator authenticity. It is distinct from login credentials and content-encryption keys.

### Capsule content key

A unique random symmetric key used to encrypt one protected Capsule payload. It is protected by a key-release arrangement and is never derived directly from an account password.

### Viewer device key

A key pair created by one trusted Viewer installation. It proves control of a registered device and allows content keys to be wrapped to that Viewer.

### Key-release provider

A creator-selected service or component that validates authorization and returns a Capsule content key, or a key share, encrypted to an authorized Viewer device.

### Reputation continuity

The property that accumulated standing and abuse consequences persist across ordinary login, device replacement, key rotation, and account recovery.

### Pseudonym

An identifier used in place of a viewer's legal identity. Pseudonyms may be scoped to a creator, community, provider, or other context to reduce correlation.

## Terms to use carefully

- **Fingerprinting** often implies covert identification. Prefer session telemetry, device evidence, or explicit credential when participation is consented.
- **Human score** can overstate certainty. Prefer human confidence and state its evidence and freshness.
- **Trusted user** is incomplete without specifying trusted by whom, for what purpose, and based on which evidence.
- **DRM** implies stronger post-access control than Capsule intends to promise.

## Related documents

- [Trust model](../05_ctx/trust-model.md)
- [Reputation and signals](../05_ctx/reputation-and-signals.md)
