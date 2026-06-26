# V1 Trust Profile and Retained State

Status: Provisional
Last updated: 2026-06-25

## Purpose

Define the minimum account, consent, usage, risk, and audit state needed for V1 policy evaluation while allowing internal storage details to adapt to implementation evidence.

## Core boundary

V1 does not create one universal public trust score. It retains only the state required for account continuity, the accepted policy predicates, key-release replay prevention, conservative automation-risk assessment, challenge-based step-up verification, viewer control, and security operations.

The V1 profile is multidimensional and provider-private. Creators receive only the predicates or aggregates explicitly supported by policy and approved for disclosure. Hosts receive no trust-profile state. The reference provider may internally compute a final Trust Capsule outcome from independent private score components, but that does not create a creator-visible universal reputation score.

## Provisional V1 dimensions

### Account state

- Internal account identifier
- Verified-email status
- Account lifecycle status, such as active, suspended, or deleted
- Authentication and recovery state necessary to secure the account
- Creation and security-relevant timestamps

Email addresses and authentication records are account data, not creator-visible trust evidence.

### Registered Viewer devices

- Device record and user-facing name
- Ed25519 proof public key and identifier
- X25519 agreement public key and identifier
- Registration, last-use, and revocation state
- Security-relevant key-transition history where required

V1 does not require a persistent hardware fingerprint or unrelated device inventory.

### Consent state

- Approved Host origins
- Site-scoped automatic-opening choice
- CTX measurement, retention, and disclosure grants
- Policy, recipient, purpose, and scope covered by standing consent
- Grant, update, expiration, and revocation timestamps

Site permission, automatic opening, measurement, retention, and disclosure remain separate decisions even when the UI presents them coherently.

### Capsule usage counters

- Capsule-global committed key-release count
- Per-account, per-Capsule committed key-release count
- Counter version and last-update information required for atomic enforcement

Counters represent committed key releases, not proof that a human saw or attended to content. They are updated atomically during ticket redemption.

Capsule-global and per-account Capsule counters persist only while needed to enforce an active Capsule policy. When a Capsule is permanently revoked or its broker release material is destroyed, its enforcement counters are deleted through the normal data-lifecycle process. Deleting a viewer account removes its per-account counters; it does not decrement the Capsule-global count while that Capsule remains active.

### Creator metrics projections

Share Capsules may derive a creator-facing operational projection from authorization and broker-redemption events. The projection contains Capsule-level totals, bounded time buckets, safe denial-category aggregates, limit status, and thresholded per-account limit-pressure indicators. It does not contain viewer identifiers, individual access histories, exact per-viewer timestamps, raw trust evidence, raw denial context, IP addresses, user agents, or device identifiers.

Low-volume breakdowns are suppressed when they could reveal one viewer's activity or trust state. Suppression does not alter authoritative enforcement counters. The event and projection schemas are versioned and provider-aware, but extensibility does not authorize collection of a new data category.

Country, device class, browser family, operating-system family, and Viewer version analytics are not part of the V1 retained profile. Adding them later requires explicit analytics consent, purpose and retention definitions, coarse values, cohort suppression, and an accepted privacy review.

### Automation-risk state

- Current V1 result, such as `high`, `not_high`, or a low-confidence state that requires step-up verification before access
- Recent `usage_score` from `0` to `100`, where `100` means no high-risk recent usage evidence was detected rather than proven trustworthiness
- `usage_confidence`, such as `zero`, `low`, `medium`, or `high`, describing the amount and freshness of usage evidence behind the score
- Ruleset or model identifier and version
- Evaluation and expiration times
- Minimal rolling aggregates needed by enforced deterministic rules
- Internal reason categories needed for review, correction, and abuse response

Raw global viewing history is not disclosed to creators. Observation-only signals remain distinguishable from enforced signals and cannot change access decisions.

An account with no retained usage evidence defaults to a clean usage score with zero confidence, such as `usage_score: 100` and `usage_confidence: zero`. This means the provider has no current negative usage signal; it is not a claim that the account is established, human, unique, or benign.

### Challenge state

- Current `challenge_score` from `0` to `100`, defaulting to `0` when there is no current completed challenge
- `last_challenged_at` and `challenge_expires_at`
- Challenge-set or scoring-model identifier and version
- Selected challenge module identifiers, module versions, lifecycle states at attempt creation, selector version, and scoring adapter versions
- Binding context, such as account, Viewer device, Host site, policy digest, Capsule identifier, or other documented scope
- Aggregate challenge cadence fields, such as `challenge_success_streak`, `challenge_refresh_tier`, `last_challenge_score`, and `last_reset_reason`, when progressive retesting is enabled
- Minimal result and audit fields needed for replay resistance, explanation, abuse response, and pruning

Challenge evidence is temporary step-up evidence. It must not contain plaintext Capsule content, content keys, recovery material, raw pointer traces retained longer than needed, complete session replay, biometric templates, identity documents, or unnecessary behavioral data. A successful challenge may support a low-history or ambiguous viewer but cannot override active severe usage risk.

Progressive challenge cadence is retained as aggregate provider-private state so raw challenge attempts can still expire on the ordinary retention schedule. The reference direction is a standard 7-day challenge freshness window for new or reset viewers, with an extended 30-day window after five consecutive clean successful challenge windows. Low challenge scores, failed or abandoned checks, suspicious usage, and high automation-risk outcomes reset the cadence to the standard window. The cadence determines freshness only; it is not disclosed to creators as a separate policy control.

### Trust Capsule outcome state

The provider may combine independent usage and challenge components into a private, versioned Trust Capsule decision:

```text
usage_score: 0-100
usage_confidence: zero | low | medium | high
challenge_score: 0-100
last_challenged_at: timestamp | null
challenge_expires_at: timestamp | null
final_trust_score: 0-100
final_outcome: allow | challenge_required | deny | temporarily_unavailable
```

The final score is an implementation detail used to reach the policy outcome. Public and creator-facing language should describe current access confidence or trust-gate satisfaction, not a universal measure of the viewer's trustworthiness.

### Authorization and replay state

- Pending ticket identifier and private account/Capsule mapping
- Ticket issue, expiry, redemption, consumption, and revocation state
- DPoP and challenge replay state required by protocol security
- Idempotency and transaction records required for atomic counter behavior

This state is protocol security material, not a durable reputation dimension.

Expired tickets, replay identifiers, DPoP nonces, and equivalent replay artifacts expire within 24 hours. They must not become a durable access-history store.

### Security and audit state

- Account, authenticator, device, recovery, policy, ticket, broker, and administrative security events
- Actor, scope, outcome, timestamp, and correlation identifiers needed for investigation
- Redacted failure and risk categories

Audit records must not contain passwords, private keys, recovery codes, OAuth tokens, content keys, plaintext, raw trust credentials, or complete behavioral traces.

Identifiable CTX access-event detail and the rolling data used by V1 automation-risk rules expire within 30 days. Authentication, account recovery, administrative, and broker security audit records expire within 90 days unless a separately documented legal preservation obligation applies. Preservation is exceptional, access-restricted, and must not silently change the ordinary product retention policy.

## Disclosure boundary

| State | CTX Provider | Viewer/account holder | Creator | Host |
|---|---|---|---|---|
| Account and email status | Required internally | Visible | Predicate only when policy requires | Never |
| Registered device details | Required internally | Visible and revocable | Device predicate only | Never |
| Consent records | Required internally | Visible and revocable | Approved policy result only | Automatic-opening state may affect local rendering but is not disclosed as profile data |
| Capsule-global count | Required | Relevant limit status | Creator-owned Capsule aggregate may be available | Never |
| Per-account Capsule count | Required | Relevant limit status | Requirement satisfied or denied; no global identity | Never |
| Capsule metrics projection | Aggregate source events only as retained | Relevant activity controls where defined | Privacy-safe aggregate for creator-owned Capsules | Never |
| Automation-risk state | Required | Current status and useful explanation | Accepted predicate only | Never |
| Challenge state | Required when a challenge is attempted | Current or expired status, useful explanation, and applicable retry path | Accepted predicate or challenge-required outcome only | Never |
| Trust Capsule score components | Required internally when the Trust Capsule predicate is evaluated | Useful explanation without exposing abuse thresholds or sensitive raw evidence | Final predicate or safe denial category only | Never |
| Raw ecosystem activity | Minimized internal use | Activity/account controls as defined | Never | Never |
| Ticket and replay state | Required temporarily | Recent access event where useful | Never | Never |
| Security audit state | Restricted internal use | Applicable account activity and appeal information | Only creator-owned administrative events where defined | Never |

## Implementation adaptability

Database tables, indexes, aggregate representations, cache placement, and internal event schemas may change as implementation and load testing reveal better designs. Those are replaceable details when they preserve the accepted protocol semantics, consent boundaries, disclosures, and lifecycle behavior.

The following are not internal implementation details and require an accepted design update before change:

- Collecting a new category of viewer or device data
- Expanding observation to surrounding pages, unrelated browsing, or passive interaction
- Turning an observation-only signal into an access gate
- Creating a universal or creator-visible trust score
- Disclosing raw history or a global account identifier to creators or Hosts
- Changing what a committed view means
- Extending retention beyond its documented purpose
- Repurposing profile data for advertising or unrelated targeting

## Accepted deletion boundary

Account closure immediately revokes sessions, devices, and CTX access and starts a 30-day recovery period. Creator-controlled release handles remain paused during that period. Share Capsules warns the creator which Capsules will stop working and offers a downloadable inventory, but does not transfer them to another account. If the account is not securely restored, permanent deletion removes personal account data and the detailed trust profile, revokes remaining release handles, and causes the broker to destroy their associated content-key material. A newly created account begins with no inherited reputation or continuity and receives new per-account counters.

Capsule-global committed-release counters remain because they are Capsule state. Account-linked counters and risk history are deleted rather than carried into another account.

Ordinary deletion leaves no account-level tombstone. For an account under an active sanction, V1 may retain for at most 90 days from deletion only a keyed HMAC of the normalized verified email, sanction category, imposed and expiry timestamps, and an appeal reference. It contains no raw email, activity history, counters, device fingerprint, credentials, or trust profile. It is available only to signup-abuse enforcement and authorized security or appeal personnel, and is removed immediately if the sanction is reversed or when the retention period expires.

Deleted data may remain in encrypted disaster-recovery backups for at most 30 additional days. Backups are unavailable to ordinary product and analytics access. If a backup is restored, a minimal durable deletion ledger must reapply completed deletions before the restored system serves traffic. The ledger identifies deletion obligations without retaining the deleted account's trust profile or activity history.

Account deletion is not a one-human-one-account control. A user can abandon an existing account without deleting it, so reset resistance comes from reputation taking time to establish, signup-abuse controls, Capsule-global limits, automation-risk controls, and future optional personhood evidence.

## V1 retention schedule

| Data class | Ordinary V1 retention |
|---|---|
| Account pending deletion | 30-day recovery period |
| Expired ticket and replay artifacts | No more than 24 hours |
| Expired challenge attempts and module result evidence | No more than 24 hours after the attempt expires |
| Identifiable CTX access-event detail | No more than 30 days |
| Automation-risk rolling data | No more than 30 days |
| Authentication, recovery, administrative, and broker security audits | No more than 90 days |
| Active-sanction deletion tombstone | Until reversal, sanction expiry, or 90 days from deletion, whichever occurs first |
| Deleted data in disaster-recovery backups | No more than 30 additional days |
| Capsule enforcement counters | Only while required by an active Capsule policy |
| Creator metrics aggregates | Only while the Capsule remains active or the creator retains the Capsule record; source detail remains subject to the shorter CTX event limits |

Implementation may not treat “useful later” as a retention purpose. A legally required preservation exception must be documented, access-restricted, scoped to the affected records, and removed when the obligation ends.

## Related documents

- [CTX trust model](trust-model.md)
- [Reputation and signals](reputation-and-signals.md)
- [V1 automation risk](automation-risk.md)
- [CTX policy model](policy-model.md)
- [Authorization and key release](authorization-and-key-release.md)
- [Privacy model](../07_security-and-privacy/privacy-model.md)
- [V1 threat model](../07_security-and-privacy/threat-model-v1.md)
- [Capsule metrics dashboard](../02_product/capsule-metrics-dashboard.md)
