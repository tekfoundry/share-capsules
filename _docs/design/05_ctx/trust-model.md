# CTX Trust Model

Status: Draft
Last updated: 2026-06-18

## Purpose

Describe what trust means in CTX, how it is represented, and who has authority to interpret it.

## Central idea

The difficult problem is not content encryption. It is allowing a creator to express:

> Who do I trust to decide whether this viewer may access my content, and what evidence do I require?

CTX does not define trust universally. CTX evaluates creator-selected evidence according to creator-selected policy.

## Three-layer model

### Observed facts

Facts describe measured or verifiable state without deciding whether it is good or bad.

Examples:

- Account created nineteen months ago
- Fourteen protected-content views this week
- Three signed Capsules published
- Member of a community for eleven months
- Recent session completed a step-up challenge

### Provider assertions

Assertions interpret evidence within a stated scope.

Examples:

- A community considers the viewer an established contributor
- A provider considers the account likely controlled by a persistent human
- A risk provider detected unusually automated behavior
- A personhood provider verified unique enrollment

Assertions must identify their issuer, scope, freshness, confidence where appropriate, and revocation or expiration behavior.

### Creator policy

Policy determines whether facts and assertions are sufficient for access.

A conceptual policy might require:

```text
established member of Community A
AND account continuity above required threshold
AND monthly views below creator limit
AND current automation risk is not high
```

This example communicates intent only; it is not CTX syntax.

## Multidimensional trust

The trust profile may contain independent dimensions such as:

- Account continuity
- Human confidence
- Community membership
- Community contribution or giver standing
- Creator activity
- Viewing history and volume
- Automation or anomaly risk
- Personhood assurance
- Identity assurance
- Direct creator approval

No dimension should silently stand in for all others.

## V1 baseline policy

The primary V1 gallery uses a deliberately small set of policy inputs. Access to an individual Capsule requires:

- A verified Share Capsules email address
- A valid, non-revoked Share Capsules account
- A registered, non-revoked Viewer extension device
- Explicit consent to record Capsule view events
- Satisfaction of any creator-configured opening and closing time boundaries
- Remaining capacity under any creator-configured global lifetime limit for that Capsule
- Remaining capacity under any creator-configured per-account lifetime limit for that Capsule
- Satisfaction of an optional creator-selected current ecosystem automation-risk-not-high predicate

The access decision is made online for every attempted open. Only committed single-use key release creates a qualifying view event and atomically updates both the Capsule-global and account-and-Capsule counters. Copies or mirrors with the same Capsule identifier share those counters. V1 offers no offline access; reopening or reloading requires another authorization and committed release.

CTX does not impose hard-coded creator-policy values. The creator may embed an opening instant, closing instant, or both and may independently select a global lifetime maximum, a per-account lifetime maximum, both, or neither in each Capsule's signed policy. Operational rate limits used to protect Share Capsules itself are separate security controls and must not be presented as creator policy.

The retained V1 state is deliberately narrow and contains no universal trust score. See [V1 trust profile and retained state](trust-profile-v1.md).

V1 automation risk uses CTX request and committed-release metadata already produced by access operations. It does not require account-age thresholds, government identity, personhood verification, passive behavioral analysis, mouse-movement analysis, or a generalized human-confidence score. Richer gates remain possible after their accuracy, accessibility, privacy, and appeal implications are designed and tested.

## Context and scope

Trust is always scoped. A community may recognize a contributor without asserting legal identity. A creator may approve a viewer without endorsing them elsewhere. High viewing volume may be ordinary for a curator and suspicious for another policy.

Credentials and assertions should declare whether they are:

- Ecosystem-wide
- Provider-specific
- Community-specific
- Creator-specific
- Capsule-specific
- Session-specific

## Time and change

Trust changes. Evidence may expire, decay, be superseded, or be revoked.

- Account age generally persists.
- Community membership can end.
- Contribution standing can evolve.
- A current automation assessment should expire quickly.
- A successful challenge should be short-lived.
- Sanctions should have stated scope, duration, and appeal behavior.

Turning telemetry off should not automatically erase durable credentials, but freshness-dependent assessments will eventually become unavailable or stale.

## Share Capsules accounts

The current V1 direction uses a minimal centralized Share Capsules account:

- Email address
- Password
- Verified control of the email address
- Recovery method
- Tracking and disclosure disabled by default

Passkeys are supported in V1 and strongly encouraged but not mandatory. They strengthen authentication and continuity; they do not establish unique personhood. Authentication credentials are not Capsule encryption or creator signing keys.

An account begins with little evidence and therefore limited access. It earns stronger continuity and contextual reputation through time, participation, credentials, and voluntarily enabled signals.

Email and password do not establish unique personhood. The system may accept stronger optional providers without requiring legal identity for every account.

## Reputation continuity and replacement

The system should make it difficult to build reputation, abuse it, discard the account, and immediately return with equivalent access.

Possible tools include:

- Long-lived account and key history
- Passkey and device continuity
- Recovery that preserves prior reputation
- Community relationships
- Optional personhood verification
- Rate limits for new accounts
- Provider-issued duplicate-enrollment controls

Perfect one-human-one-account enforcement cannot be achieved from cryptographic keys or email alone.

V1 therefore makes account continuity and replacement cost its guarantee, not unique personhood. Capsule quotas are per Share Capsules account. Stronger duplicate-enrollment resistance remains an optional future credential from a personhood provider.

## Trust is not currency

Trust is non-transferable, contextual, private, revocable, and time-sensitive. Personal reputation should not be placed on a public blockchain or treated as a fungible asset.

Useful decentralized patterns may include user-controlled credential wallets, signed credentials, multiple issuers, selective disclosure, revocation registries, and public provider-key transparency.

## Open questions

- Which dimensions belong in the CTX core versus external providers?
- Should policies consume exact values, ranges, predicates, or all three?
- How are score definitions made understandable and comparable?
- Who may issue negative risk assertions, and how are they challenged?
- How does account portability preserve continuity without enabling reputation resets?

## Related documents

- [Reputation and signals](reputation-and-signals.md)
- [Human confidence](human-confidence.md)
- [V1 automation risk](automation-risk.md)
- [V1 trust profile and retained state](trust-profile-v1.md)
- [Privacy model](../07_security-and-privacy/privacy-model.md)
- [Accounts and identity](../03_architecture/accounts-and-identity.md)
