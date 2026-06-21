# Privacy Model

Status: Draft
Last updated: 2026-06-20

## Purpose

Define the privacy outcomes, consent boundaries, and data-minimization expectations that constrain Share Capsules, CTX implementations, and Viewer design.

## Privacy objective

Creators need enough evidence to make meaningful access decisions. Viewers should not need to expose identity or complete activity histories when a narrower fact can satisfy policy.

Privacy does not guarantee access. A viewer may decline disclosure, and a creator may conclude that insufficient evidence is available. The system must make that consequence clear without resorting to hidden collection.

## Consent

Collection and disclosure must be:

- Explicit
- Granular
- Informed
- Revocable
- Time- and recipient-bound where practical
- Visible in an account or Viewer activity log

The design separates permission to measure, calculate and retain, and disclose. Enabling one does not silently enable the others.

## Scope

Consent may be granted for:

- One access request
- One Capsule
- One creator
- One community
- One host site
- A defined class of policies

Per-creator consent is the preferred default candidate because per-Capsule prompts may become exhausting and per-host consent gives too much significance to an interchangeable Host.

Surrounding-site telemetry requires separate permission from telemetry inside the trusted Viewer.

V1 site permission, automatic-opening consent, and CTX disclosure consent are distinct:

- Site permission lets the extension discover `<capsule-viewer>` elements and fetch Capsules on that HTTPS origin.
- Automatic-opening consent lets eligible Capsules on that site initiate authorization as they approach the viewport.
- CTX disclosure consent defines which evidence may be used or disclosed for policy evaluation.

Approving one does not silently approve the others. Standing automatic-opening and disclosure consent may reduce repeated prompts only within their displayed site, policy, recipient, and disclosure scope. Viewers can inspect and revoke automatic opening per site.

## Data minimization

CTX implementations should prefer:

- Predicates over exact values
- Aggregates over event histories
- Local derivation over raw-data upload
- Short-lived assertions over permanent profiles
- Scoped pseudonyms over global viewer identifiers
- Provider credentials over copies of source documents

Examples:

```text
unique_person_requirement_satisfied: true
account_age_requirement_satisfied: true
monthly_view_limit_satisfied: true
current_automation_risk_not_high: true
```

## Prohibited or strongly disfavored collection

Absent a future explicit design decision with strong justification, Share Capsules, other CTX services, and Viewers should not collect:

- General browsing history
- Activity from unrelated tabs or applications
- Searches, purchases, messages, or typed page content
- Raw biometric templates or identity-document images
- Continuous screen or session recordings
- Raw pointer trails when derived features are sufficient
- Data for advertising or unrelated behavioral targeting

## Correlation

One persistent public account identifier would make reputation simple but enable ecosystem-wide tracking. The preferred direction is a persistent root account combined with scoped identifiers or pseudonyms for creators and communities.

The design should explore separating:

- The provider that knows real-world identity or personhood evidence
- The provider that calculates trust attributes
- The service that sees a Capsule authorization request
- The service that releases a content key

An aspirational privacy invariant is:

> No single organization should need both a viewer's legal identity and their complete protected-content viewing history.

Whether V1 can fully satisfy this remains open.

## Biometrics and identity

If a creator requires personhood or identity assurance, a specialist provider should perform verification and issue a limited credential. Share Capsules, other CTX services, creators, Hosts, and ordinary Viewers should not receive raw biometric evidence.

The credential should disclose only the required assurance, issuer, validity, and revocation information.

Device binding, liveness, photo-to-document matching, identity validation, and duplicate-enrollment checks are distinct opt-in assertions. They must not be collapsed into one ambiguous verification status. Raw device fingerprints, photos, identity documents, document numbers, legal names, and biometric templates are not disclosed to creators through normal CTX evaluation.

## Behavioral telemetry

Session telemetry may be valuable for human confidence and automation-risk assessment. It must remain bounded to protected use, clearly indicated, and inclusive of different interaction modes.

The Viewer should derive features locally where practical and disclose assessments or predicates rather than complete behavioral traces.

The V1 baseline does not collect pointer movement, keyboard patterns, scrolling behavior, surrounding-page activity, or other passive behavioral telemetry. It records committed Capsule key-release events needed for creator-configured global and per-account Capsule limits and any separately accepted ecosystem-level abuse assessment, after explicit consent. Declining that consent prevents access under the V1 baseline policy but does not authorize hidden collection.

For V1, Share Capsules necessarily learns that the account and registered device requested and received authorization for a particular Capsule at a particular time. The Host and creator do not receive the viewer's global account identifier or detailed event history through the normal flow.

V1 may derive a short-lived automation-risk assertion from authorization and committed-release metadata across Share Capsules. The creator receives only the selected policy result, not raw ecosystem usage. Adding pointer, interaction, surrounding-page, or other passive telemetry requires a new explicit consent and versioned policy decision; it is not silently included in the V1 risk gate.

## Creator Capsule metrics

V1 exposes an operational Capsule dashboard using privacy-safe aggregates derived from authorization and committed key-release events. The authoritative view metric is broker-committed key release, not proof of rendering, attention, or human understanding.

Creators may see Capsule totals, bounded time buckets, global limit status, safe denial-category aggregates, and thresholded per-account limit-pressure indicators. They do not receive viewer identifiers, individual histories, exact access timestamps, IP addresses, user agents, hardware identifiers, raw trust evidence, or raw denial reasons. Sparse breakdowns are suppressed when they could reveal one viewer's activity or trust state.

Country, device class, browser family, operating-system family, and Viewer-version analytics are deferred beyond V1. A future implementation requires separate explicit analytics consent, a defined purpose and retention period, coarse values, minimum cohort protection, and a new privacy review. Optional analytics fields are not collected in advance merely because the event schema can carry them. Declining optional analytics does not authorize hidden collection or retroactive derivation.

## Transparency and control

Viewers should be able to inspect:

- Enabled measurements
- Retained trust attributes
- Credential issuers
- Recent disclosures and recipients
- Reasons access was denied at an appropriate level
- Expiration and revocation status
- Available correction or appeal paths

The project should use open protocols, inspectable clients, independent audits, public data practices, and governance involving both creators and viewers.

## Data lifecycle

Every data class should eventually define:

- Collection purpose
- Controller and processors
- Retention period
- Update and expiration behavior
- Export behavior
- Deletion behavior
- Effect of disabling telemetry
- Effect on active and historical reputation

Account browser sessions retain the account identifier, session identifier, IP address, user agent, and last-activity timestamp for authentication, account inspection, and revocation. These fields are visible only to the account holder and authorized security operations; they are not trust evidence disclosed to creators or Hosts. User agents are reduced to best-effort browser and platform labels in the account UI and are not treated as device fingerprints. Expired session records are removed according to the configured session lifetime and garbage-collection process.

The account-deletion boundary is defined: closure immediately disables access and pauses creator key releases; a 30-day recovery period permits secure verified-email restoration and provides a downloadable Capsule inventory; then personal data and the detailed trust profile are deleted, remaining release handles are revoked, and their broker-held key material is destroyed. Recovery tokens are high entropy, stored only as hashes, rotated when a new link is requested, and invalidated by restoration. Restoration does not reactivate old sessions, OAuth credentials, or Viewer devices. Replacement accounts inherit no reputation, and Capsule-global counters remain. V1 does not transfer Capsules between accounts; a recipient of an offline source creates an independent Capsule under their own authority.

Ordinary deletion leaves no account-level tombstone. If an active sanction exists, V1 may retain only a keyed HMAC of the normalized verified email, sanction category, imposed and expiry timestamps, and an appeal reference for at most 90 days from deletion. It is restricted to sanction enforcement and appeal, contains no behavioral history or device fingerprint, and is deleted sooner if the sanction is reversed. This is limited account-abuse friction, not personhood or duplicate-person detection.

Deleted data may persist in encrypted disaster-recovery backups for no more than 30 additional days. Those backups are unavailable to ordinary product, analytics, or security-query paths. Before a restored backup serves traffic, the system reapplies completed deletions from a minimal durable deletion ledger that does not preserve the deleted trust profile or activity history.

Expired ticket and replay artifacts persist for no more than 24 hours. Identifiable CTX access-event detail and automation-risk rolling data persist for no more than 30 days. Authentication, recovery, administrative, and broker security audit records persist for no more than 90 days. Capsule counters persist only while required to enforce an active Capsule policy. A separately required legal preservation is exceptional, scoped, restricted, and removed when its obligation ends.

The V1 data classes, disclosure boundaries, and accepted retention schedule are defined in [V1 trust profile and retained state](../05_ctx/trust-profile-v1.md). Implementation must enforce those periods automatically and verify deletion behavior before production collection.

## Open questions

- Which counters require ecosystem-wide correlation?
- Can score calculation happen locally without making it trivial to forge?
- What history remains when tracking is disabled?
- Which disclosures must creators see versus only the policy evaluator?
- What minimum cohorts and time-bucket sizes provide useful creator metrics without exposing sparse viewer activity?

## Related documents

- [Design principles](../01_foundations/principles.md)
- [Reputation and signals](../05_ctx/reputation-and-signals.md)
- [Human confidence](../05_ctx/human-confidence.md)
- [Identity and device verification](identity-and-device-verification.md)
- [Open questions](../09_planning/open-questions.md)
- [V1 automation risk](../05_ctx/automation-risk.md)
- [V1 trust profile and retained state](../05_ctx/trust-profile-v1.md)
- [Capsule metrics dashboard](../02_product/capsule-metrics-dashboard.md)
