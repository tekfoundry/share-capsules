# Reputation and Signals

Status: Draft
Last updated: 2026-06-25

## Purpose

Define the current intent for trust dimensions, behavioral evidence, score calculation, and viewer disclosure.

## Reputation model

CTX should maintain a trust profile rather than one universal reputation score. Each dimension answers a different question and includes provenance, scope, and freshness.

An illustrative profile might contain:

```text
account_continuity: established
human_confidence: moderate
community_standing("artists-a"): contributor
creator_activity: recognized
viewing_history: established
views_this_month: 37
automation_risk: low
```

Names, scales, and calculations remain provisional.

The implemented V1 storage and disclosure boundary is defined in [V1 trust profile and retained state](trust-profile-v1.md). Internal schema details may evolve, but new collection, enforcement, retention, or disclosure does not qualify as a mere implementation adjustment.

For Trust Capsules, the reference direction is to compute independent score components and combine them into a final access outcome rather than treating any one signal as universal trust:

```text
usage_score: 0-100
usage_confidence: zero | low | medium | high
challenge_score: 0-100
last_challenged_at: timestamp | null
challenge_expires_at: timestamp | null
final_trust_score: 0-100
final_outcome: allow | challenge_required | deny | temporarily_unavailable
```

The `usage_score` is recent and negative-evidence oriented. A score of `100` means no high-risk recent CTX usage pattern was detected, not that the account is proven trustworthy. An account with no usage evidence defaults to `usage_score: 100` and `usage_confidence: zero`.

The `challenge_score` is recent step-up evidence. A viewer with no current completed challenge defaults to `challenge_score: 0`. Challenge currency is derived from `last_challenged_at`, `challenge_expires_at`, and the binding context rather than a separate stored challenge-confidence value.

Challenge refresh can use a provider-private progressive cadence. New or unproven viewers should be retested on a standard window, such as every 7 days. Viewers with repeated clean successful challenge windows may earn a longer window, such as 30 days after five consecutive clean successes. This cadence changes only when a challenge result is considered fresh; it does not change the meaning of `challenge_score`, create a creator-visible trust score, or expose additional creator controls. Low scores, failed checks, suspicious usage, or high automation risk reset the cadence to the standard window.

The final outcome may average eligible score components for ordinary low-confidence cases, but active severe usage risk is a hard safety boundary. A strong challenge score must not convert an account currently showing high automation or abuse risk into an allowed result.

## Candidate dimensions

### V1 implemented evidence

V1 implements only the evidence needed by its baseline gallery policy:

- Verified-email status
- Account and device revocation status
- Registered Viewer device control
- Consented Capsule view events
- Capsule-global lifetime view counts
- Per-account, per-Capsule lifetime view counts
- Predicates that any embedded creator-configured global and per-account limits have not been reached
- A short-lived ecosystem automation-risk assessment derived from CTX usage metadata

Recording a Capsule view event is activity accounting, not permission for pointer tracking, surrounding-page observation, or generalized behavioral profiling. Refusing this recording is valid, but a viewer cannot satisfy the V1 baseline policy without it.

The remaining dimensions below describe the broader intended direction. Only the narrowly defined automation-risk behavior in [V1 automation risk](automation-risk.md) is included in V1.

### Account continuity

Evidence that the same persistent account has existed and remained in ordinary use over time. Signals may include account age, key continuity, recovery history, device changes, and sanctions.

### Giver or contribution standing

Evidence that an account contributes to a community rather than only consuming from it. This dimension must be community-defined; contribution cannot be meaningfully standardized across every domain.

### Creator activity

Evidence that the account creates or publishes recognized work. Merely generating many signed Capsules must not automatically produce strong reputation because automated publishing is inexpensive.

Potential evidence includes community recognition, durable publishing history, reciprocal engagement, and consumption of the creator's work by established accounts.

### Viewing history

Describes the account's protected-content consumption over time. Frequent viewing is not inherently suspicious. Raw counts should primarily support limits, context, and anomaly analysis rather than moral judgment.

### Current usage

Time-windowed facts such as views today, this week, or this month. Creators may set acceptable limits or ask only whether the account remains under a limit.

V1 does not hard-code a catalog-wide allowance. The creator may configure global and per-account lifetime limits independently in each Capsule's embedded policy. Creator-policy limits are distinct from service-level throttles used to protect Share Capsules from abuse or excessive load.

### Automation and anomaly risk

A short-lived interpretation based on session behavior, request patterns, concurrency, credential use, environment evidence, and deviations from established behavior.

V1 limits this dimension to CTX-side authorization and committed-release metadata. Passive interaction or surrounding-page telemetry is not part of the V1 assessment. Creators may require only the predicate that the current provider-issued automation risk is not high; raw ecosystem history is not disclosed.

Only high-confidence deterministic rules affect V1 access. Experimental signals may be observed within consent boundaries but remain non-authoritative until calibration, false-positive review, privacy review, and an accepted versioned-policy decision.

In the Trust Capsule scoring direction, this dimension produces a numerical `usage_score` and an evidence-volume `usage_confidence`. Current V1 automation-risk rules are recent by design; old behavior should stop affecting the score after the relevant windows and retained rolling data expire.

### Human confidence

An assessment combining persistent history, session evidence, credentials, and optional step-up verification. See [Human confidence](human-confidence.md).

In the Trust Capsule scoring direction, recent step-up verification produces a numerical `challenge_score` that expires. It supports low-history or ambiguous accounts but remains distinct from usage risk, account continuity, identity, personhood, and benign intent.

Challenge retesting may become less frequent for viewers who repeatedly pass fresh checks without suspicious usage. That progression is aggregate trust-tuning state, not proof of personhood or a public reputation tier.

## Signal sources

Signals may come from:

- Share Capsules account events
- Trusted Viewer observations
- Creator or community interactions
- Signed credentials and receipts
- Trust-provider assertions
- Rate-limit counters
- Step-up challenges
- Optional device or personhood evidence

Host-supplied JavaScript and self-reported client values are untrusted unless independently verified.

## Consent model

Behavioral participation is opt-in. Consent is divided into:

1. **Measure** — permit the Viewer to observe specified activity.
2. **Calculate and retain** — permit measurements to update the trust profile.
3. **Disclose** — permit selected results to be shared for a particular access request.

Consent may be scoped to one access request, Capsule, creator, community, or site. Broader consent must never be silently inferred from narrow consent.

## Disclosure

CTX should prefer the least revealing evidence that satisfies policy.

Prefer:

```text
monthly_view_requirement_satisfied: true
```

over:

```text
views_this_month: 37
complete_view_history: [...]
```

The Viewer should identify:

- What is requested
- Who receives it
- Why it is requested
- How long authorization lasts
- Whether the evidence can be reused
- What access is unavailable if disclosure is refused

## Session telemetry

With explicit permission, the Viewer may derive evidence from:

- Open and rendering duration
- Interaction frequency and variation
- Pointer, touch, scroll, and keyboard modality
- Focus and visibility changes
- Request volume and timing
- Concurrent sessions
- Repetitive or mechanical interaction
- Apparent extraction behavior

Additional permission may allow observation of relevant interaction on the surrounding host page while protected content is active.

The current boundary excludes unrelated tabs, other applications, general browsing history, typed content, searches, purchases, messages, and complete session replay.

Raw pointer trails, click targets, and other unnecessarily identifying records should not be uploaded when local feature derivation is sufficient.

## Scoring principles

Scores and classifications should be:

- Explainable at a useful level
- Attributable to evidence and issuer
- Calibrated against false positives and false negatives
- Time-bound where behavior can change
- Inclusive of touch, keyboard, and assistive technology
- Resistant to trivial volume generation
- Reviewable and correctable
- Used with other evidence rather than as sole proof

Exact models may remain proprietary to competing risk providers, but CTX semantics and viewer rights should remain open.

## Gaming and limitations

Attackers can simulate interaction, age accounts, hire human operators, rent established accounts, compromise credentials, and adapt to published thresholds.

The objective is not an ungameable score. It is a layered system in which convincing history is costly, abuse reduces future access, and creators can combine independent evidence.

## Open questions

- Which measurements are sufficiently valuable to justify collection?
- Are scores computed locally, by a CTX service, by external providers, or through a combination?
- What data is retained after a viewer disables measurement?
- How can viewers inspect or dispute incorrect assessments?
- Which dimensions should be standardized across providers?

## Related documents

- [Trust model](trust-model.md)
- [Human confidence](human-confidence.md)
- [Privacy model](../07_security-and-privacy/privacy-model.md)
- [V1 automation risk](automation-risk.md)
- [V1 trust profile and retained state](trust-profile-v1.md)
