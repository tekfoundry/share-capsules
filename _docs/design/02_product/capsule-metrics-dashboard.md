# Capsule Metrics Dashboard

Status: Accepted
Last updated: 2026-06-22

## Purpose

Define the creator-facing Capsule metrics direction without turning CTX authorization into viewer surveillance or implying that a key release proves human attention.

## Metric semantics

The authoritative V1 view metric is a **committed key release**. It is recorded when the broker atomically accepts and consumes a single-use authorization ticket, increments the applicable counters, and commits the release transaction.

An authorization attempt is not a view. An issued but unredeemed ticket is not a view. A committed release still counts when the response is lost or the trusted Viewer later fails to decrypt, validate, or render the content. The dashboard must use “committed release” where precision matters and explain the shorter “view” label wherever it appears.

The system cannot prove that a person looked at, understood, or attended to rendered content. It must not present release counts as proof of human attention.

## V1 dashboard

Each creator-owned Capsule may expose a privacy-safe operational dashboard containing:

- Capsule status, revision, policy summary, creation time, and revocation state;
- total committed releases;
- committed releases over time using bounded aggregate buckets;
- Capsule-global release limit used and remaining;
- authorization attempts and successful authorization totals;
- denials grouped into creator-safe reason categories;
- thresholded aggregate indicators that per-account release limits are being reached;
- metric freshness, retention, and suppression explanations.

The dashboard is an operational and policy-management surface, not an audience-profiling product. Creators do not receive viewer account identifiers, scoped viewer pseudonyms, individual histories, exact access timestamps, raw trust evidence, raw denial reasons, IP addresses, user agents, or device identifiers.

Capsule ownership, lifecycle, immutable policy summary, creation time, and configured limits come from the durable Capsule registry. Metrics projections and short-lived authorization tickets must not reconstruct or override those values. A metrics delivery failure therefore cannot change an active revision to revoked, or a revoked revision to active.

Low-volume breakdowns that could reveal one viewer's behavior or trust state are suppressed. Per-account limit pressure remains completely hidden until exact cohort, time-bucket, and pressure thresholds pass privacy review and are recorded as a versioned configuration with boundary tests. Controller literals or undocumented defaults cannot enable the feature. Capsule-global enforcement totals remain available because they are creator-configured Capsule state; availability of a total does not justify exposing a more identifying breakdown.

## Metrics foundation

Phase 5 establishes a versioned, provider-aware event and projection model before the creator dashboard is built. The foundation distinguishes at least:

- authorization attempt;
- authorization approved and ticket issued;
- authorization denied using a stable privacy-safe category;
- broker redemption committed;
- ticket expired or rejected;
- Capsule revoked or release paused.

Broker redemption is the sole authority for committed-release metrics. Projections must be idempotent so retries, redelivery, and service recovery cannot double count. Internal records may retain the account-to-Capsule relationship needed for per-account enforcement and automation risk, but the creator analytics projection must not copy that identity link merely because it is available internally.

The event envelope may reserve a versioned optional-dimensions area for compatibility. An empty field or extensible schema is not permission to collect new data. Adding a dimension requires an accepted purpose, consent and disclosure design, retention rule, creator-view definition, and abuse analysis.

Raw tickets, DPoP proofs, credentials, content keys, plaintext, complete policies, raw trust evidence, and detailed denial context never belong in metrics events or projections.

## Future optional audience dimensions

Creator demand may justify a later, explicitly opt-in analytics extension for:

- country-level geography;
- broad device class;
- browser and operating-system family;
- trusted Viewer or extension version for compatibility diagnostics.

These dimensions are outside V1. They must not be collected speculatively or reconstructed retroactively from retained operational data.

If introduced later:

- analytics consent is separate from site permission, automatic-opening consent, and trust-policy disclosure;
- location is coarse country-level data, never exact coordinates, city, or creator-visible IP address;
- any IP-derived country value is derived for the disclosed purpose and the raw IP is excluded from the analytics projection;
- device data describes broad software or form-factor families, never a hardware fingerprint or stable device identifier;
- small cohorts and sparse combinations are suppressed;
- dimensions are not exposed as individual timelines or joined into viewer profiles;
- declining optional analytics does not silently authorize hidden collection;
- retention and deletion behavior are visible to viewers and creators.

Stronger privacy techniques, including noise or differential privacy, may be considered when concrete scale and query requirements exist. Complexity is not added before it solves a demonstrated disclosure risk.

## Protocol boundary

This document is product design intent for Share Capsules. The operational dashboard is not part of the normative CTX protocol. Future interoperable analytics claims or consent messages require separate specification work; Share Capsules-specific metrics fields must not be presented as universal CTX requirements.

## Open questions

- Which minimum cohort and time-bucket thresholds provide useful metrics without exposing sparse viewer activity?
- Which creator questions, if any, establish enough demand to justify the future optional audience dimensions?
- Should privacy-preserving noise become necessary at larger scale, and which dashboard queries would require it?

## Related documents

- [V1 creator and viewer experience](v1-user-experience.md)
- [CTX authorization and key release](../05_ctx/authorization-and-key-release.md)
- [V1 trust profile and retained state](../05_ctx/trust-profile-v1.md)
- [Privacy model](../07_security-and-privacy/privacy-model.md)
- [V1 automation risk](../05_ctx/automation-risk.md)
