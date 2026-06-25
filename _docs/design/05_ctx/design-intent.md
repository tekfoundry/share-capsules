# Capsule Trust Exchange Design Intent

Status: Draft
Last updated: 2026-06-19

## Purpose

Capture the intended responsibility and limits of the Capsule Trust Exchange before specifying messages or policy syntax.

## Intent

CTX enables a creator to state what trust evidence is acceptable and enables a Viewer to present consented evidence in support of an access request.

CTX coordinates:

- Discovery of access requirements
- Trust-provider and credential identification
- Viewer disclosure and consent
- Presentation and verification of evidence
- Policy evaluation
- Step-up verification
- Authorization and revocation
- Coordination with content-key release

CTX evaluates trust; it does not define a universal trustworthy person.

## Accounts and services

A centralized Share Capsules account and CTX API are the expected practical V1. The account begins with minimal information and low trust. Optional participation allows it to accumulate credentials and time-based reputation.

The protocol must retain a distinction between Share Capsules, other CTX Providers, and CTX itself. Share Capsules is the initial reference provider, not a required authority. Compatible providers must be able to emerge, and Capsules must be able to identify a creator-selected provider without privileging Share Capsules in the format.

## Policy inputs

Policies may eventually evaluate:

- Credentials
- Membership and contribution standing
- Account continuity
- Creator activity
- Current and historical viewing limits
- Human-confidence and automation-risk assertions
- Personhood or identity assurance
- Direct creator approval
- Recent step-up verification

Policies should request the least revealing evidence that can satisfy the creator's intent.

Policy is embedded as a versioned structured JSON object with stable predicate identifiers. V1 supports one `all` profile containing the baseline requirements; it does not execute arbitrary policy code or implement a general expression language. Unknown or unsupported required semantics fail closed. See [CTX policy model](policy-model.md).

The V1 reference policy is intentionally narrower than the eventual policy model. Each Capsule embeds its creator-signed policy. That policy requires verified email, a valid account, a registered Viewer device, and explicit consent to Capsule view-event accounting. The creator may also select an opening instant, closing instant, or both for the exact Capsule revision; set global and per-account Capsule lifetime limits; and require a current provider-issued ecosystem automation-risk-not-high predicate. Access-window time is evaluated online at authorization and again immediately before committed key release. V1 automation risk uses CTX usage metadata only; higher-assurance identity, personhood, account-age, and passive behavioral inputs remain separately defined concerns.

Product language groups these optional policy gates into creator-facing Capsule patterns:

- **Time Capsules** use date or time-window gates to control when protected content may be opened.
- **Limit Capsules** use count or future rate gates to control how often protected content may be opened.
- **Trust Capsules** use trust, risk, or evidence gates to control whether a specific viewer/session should be allowed.

These are not separate container formats. They are human-readable patterns over the signed CTX policy, and a single Capsule may combine Time, Limit, and Trust gates.

The embedded policy is immutable within its signed Capsule revision. CTX evaluates that policy as written. A provider may deny, suspend, or revoke access, but it must not authorize access under requirements weaker than the signed policy.

## Authorization artifact

V1 issues a signed Ed25519 JWT authorization ticket with a 60-second lifetime, exact broker audience, single-use identifier, and bindings to the Capsule, revision, policy, payload, action, suite, and Viewer device-key set. The broker must redeem the ticket online so the issuer can atomically prevent replay and enforce the view limit.

This protocol-shaped ticket is implemented with one configured Share Capsules provider and broker in V1 while preserving a path to independent providers. See [Authorization and key release](authorization-and-key-release.md).

## Limits

CTX cannot prove future behavior, prevent an authorized person from copying visible content, or establish unique personhood without an external enrollment mechanism.

## Open questions

- Which decisions can be local and which require online services?
- How are provider discovery, revocation, and federation represented?
- How does CTX preserve privacy while enforcing ecosystem-wide limits?

## Related documents

- [Trust model](trust-model.md)
- [Reputation and signals](reputation-and-signals.md)
- [Authorization and key release](authorization-and-key-release.md)
- [CTX policy model](policy-model.md)
- [V1 automation risk](automation-risk.md)
- [System overview](../03_architecture/system-overview.md)
