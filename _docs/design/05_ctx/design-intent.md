# Capsule Trust Exchange Design Intent

Status: Draft
Last updated: 2026-06-25

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

Trust Capsules should remain a simple creator-facing control even as the provider-side evaluation grows more nuanced. The reference product may expose one "Trust Capsule" choice while internally combining independent, versioned signals such as recent usage confidence and recent challenge evidence. The exact scoring model is provider-private and versioned, but it must preserve the public meaning of the signed policy predicate and the viewer's explanation rights.

The intended Trust Capsule direction is:

- A recent usage score, from `0` to `100`, reflects whether the viewer account's recent CTX authorization and committed-release behavior shows high automation or abuse risk. `100` means no negative recent usage evidence was detected; it does not mean the viewer is proven trustworthy. A no-data account defaults to `100` with `zero` usage confidence so a clean slate is not treated as bad history.
- A usage-confidence rating, such as `zero`, `low`, `medium`, or `high`, describes the amount and freshness of usage evidence behind the usage score.
- A challenge score, from `0` to `100`, reflects recent step-up challenge performance. A viewer with no current completed challenge has a challenge score of `0`.
- Challenge evidence is represented by timestamps and scope, such as `last_challenged_at`, `challenge_expires_at`, and the account, device, site, policy, or Capsule context to which the result is bound. A separate stored challenge-confidence field is unnecessary; the current, expired, or absent state is derived from those timestamps.
- A final Trust Capsule outcome combines the independent scores into an allow, challenge-required, deny, or temporarily-unavailable result. Recent severe usage risk cannot be overridden by a high challenge score, because a human solver, rented account, compromised account, or paid operator may still satisfy a challenge while harvesting content.

Trust Capsule language should describe this as current access confidence, risk reduction, or step-up verification. It must not claim that a viewer is a unique person, benign actor, or generally trustworthy in all contexts.

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
