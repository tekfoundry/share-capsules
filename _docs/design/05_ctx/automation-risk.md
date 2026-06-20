# V1 Automation Risk

Status: Draft
Last updated: 2026-06-19

## Purpose

Define the V1 ecosystem-level automation-risk signal and its privacy, policy, and evolution boundaries.

## Intent

A creator may want to reject an account whose protected-content activity is occurring at a rate or concurrency inconsistent with ordinary human viewing, even when that account has not exceeded the limits on the creator's own Capsule.

V1 therefore provides an optional policy predicate meaning:

```text
current ecosystem automation risk is not high
```

This is a short-lived risk assessment, not a universal trustworthiness score, proof of humanity, moral judgment, or permanent reputation penalty.

## V1 evidence boundary

The Share Capsules V1 assessment uses service-side metadata already produced by CTX authorization and key-release operations, including:

- Authorization-request frequency
- Committed key-release frequency across Capsules
- Activity across distinct Capsules or creators
- Concurrent or overlapping access activity
- Replayed, invalid, denied, or anomalous requests
- Device and account continuity relevant to the current requests

V1 does not use pointer movement, scrolling, keystroke patterns, dwell-time surveillance, surrounding-page observation, unrelated browsing, or activity from other applications.

Operational service rate limits may stop extreme traffic independently. Automation risk interprets recent usage for creator policy; it must not be confused with infrastructure throttling or creator-configured Capsule quotas.

## Assessment and disclosure

The assessment is calculated by the CTX Provider and carries:

- Issuer
- Model or ruleset identifier and version
- Assessment time
- Expiration time
- Result and, where appropriate, confidence or availability state

V1 policy consumes only the least-revealing predicate needed for access. Creators learn whether the requirement was satisfied, not the viewer's global account identifier, raw ecosystem counts, Capsule history, device list, or detailed anomaly record.

The viewer should see that ecosystem CTX usage contributes to the assessment and should receive a useful general explanation when high automation risk blocks access. Exact abuse thresholds need not be exposed when doing so would make evasion trivial, but decisions must remain reviewable and correctable.

## V1 enforcement boundary

V1 access enforcement uses only deterministic, versioned rules for high-confidence automation patterns. Examples may include implausible sustained authorization or committed-release velocity, abusive concurrency, and repeated protocol misuse tied to the registered account or device. Exact thresholds must be tested, calibrated, and recorded as part of an identifiable ruleset version.

Broader candidate signals may run in observation mode to measure usefulness and false positives. Observation-only signals:

- Must not deny access
- Must not change the V1 automation-risk predicate
- Must not create a creator-visible negative assertion
- Must be labeled experimental internally
- Must remain within accepted collection and retention consent
- Identifiable access-event detail and rolling automation-risk inputs expire within 30 days
- Require review before promotion into an enforcement ruleset

The V1 policy gate rejects only a current `high` result from the enforced ruleset. A `not high` result means no high-confidence V1 automation pattern was detected; it does not mean the account is verified human or generally trustworthy.

Ruleset changes that materially alter evidence, collection, or policy meaning require a new version and documentation. A newly observed signal becomes an enforcement gate only after calibration, false-positive analysis, privacy review, viewer explanation, and an accepted design decision.

## Policy behavior

The automation-risk requirement is optional per Capsule. When selected, it is combined with the other V1 requirements using the V1 `all` policy profile.

The assessment must be current at authorization time and is rechecked during ticket redemption when necessary to prevent a burst of concurrently issued tickets from bypassing it. A prior low-risk result does not create durable entitlement.

The predicate does not replace Capsule-global or per-account lifetime limits. All selected requirements must independently pass.

## Evolution

V1 begins with explainable, deterministic rules derived from CTX usage metadata. Thresholds and windows must be calibrated using representative legitimate and abusive patterns, with conservative handling of false positives. Signals that have not met that standard remain observation-only.

As consented telemetry and provider capabilities improve, CTX may add new gates for dimensions such as stronger automation evidence, human confidence, account continuity, or step-up verification. New meanings require new versioned predicates or assertion profiles. They must not silently broaden V1 collection or reinterpret the V1 predicate to include passive behavioral tracking.

Competing future Trust Providers may issue compatible automation-risk assertions using different models. Assertions must identify their issuer and model version so creators and CTX Providers can decide which sources they accept.

## Limitations

High request volume is not proof of automation, and low volume is not proof of humanity. Legitimate researchers, moderators, curators, accessibility tools, shared environments, or unusual workflows may produce atypical patterns. Attackers may throttle bots, distribute activity, rotate accounts, or use human operators.

The V1 gate raises the cost of obvious automated harvesting while preserving a path to richer layered evidence. It does not solve unique personhood or malicious intent.

## Related documents

- [CTX policy model](policy-model.md)
- [Reputation and signals](reputation-and-signals.md)
- [Human confidence](human-confidence.md)
- [Privacy model](../07_security-and-privacy/privacy-model.md)
- [Authorization and key release](authorization-and-key-release.md)
