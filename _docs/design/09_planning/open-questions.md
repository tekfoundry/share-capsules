# Open Questions

Status: Draft
Last updated: 2026-06-20

## Purpose

Maintain a visible backlog of unresolved design questions. An unanswered question is not an implicit decision.

## Product and promise

- What outcome would make a creator adopt Capsule despite viewer friction?
- Which forms of misuse matter most in V1?
- How should the product explain risk reduction without promising copy prevention?
- Which static hosting environments should the reference example verify first?

## Accounts and identity

- How expensive should account recreation be?
- How do recovery and key rotation preserve reputation continuity?
- Can accounts move between CTX providers without resetting reputation?

## Trust and reputation

- Which trust dimensions are standardized?
- Who defines giver, creator, and viewer standing?
- Are values disclosed as exact scores, bands, predicates, or credentials?
- How do scores decay, expire, and recover?
- What evidence is difficult enough to simulate to be useful?
- What appeals and corrections are available?

## Telemetry and privacy

- Which future observations inside the Viewer are sufficiently valuable and respectful to add beyond V1 view-event accounting?
- Which future surrounding-page signals could ever justify additional permission?
- Which calculations happen locally versus centrally?
- What raw data, if any, is retained?
- What happens to scores when tracking is disabled?
- How can federated providers enforce ecosystem-level risk and per-account limits without exposing a global correlatable identity?

## Human confidence

- Which passive signals are inclusive and useful?
- Which accessible step-up challenges should be available?
- How long does a challenge result remain relevant?
- Which personhood providers or assurance models are acceptable?
- How should CTX communicate uncertainty and false positives?

## Authorization and cryptography

- How is authorization bound to a Capsule, account, Viewer, device, and time?
- How do revocation and already downloaded Capsules interact?
- How are creator and service keys rotated?

## Viewer security

- For each future content profile, should the Viewer render the source directly or require a safe static rendition?
- How are scripts, external resources, macros, embedded objects, links, and other active document features removed or isolated?
- Which telemetry is trustworthy in a user-controlled browser?
- How are modified Viewers detected or limited?
- How should future lower-assurance web Viewers expose capability and accessibility claims to creator policy?

## Federation and governance

- How are trust providers discovered and selected?
- What makes one CTX service compatible with another?
- Which registries, if any, need shared governance?
- How are malicious or compromised providers removed?
- What governance model earns the confidence of both creators and viewers?

## Near-term decisions

No unresolved design-intent decision currently blocks the initial MVP plan. Publishing and validating the static reference Host and benchmarking the provisional image envelope are implementation and release-validation tasks, not reasons to expand V1 scope.

## Related documents

- [Vision and problem](../01_foundations/vision-and-problem.md)
- [System overview](../03_architecture/system-overview.md)
- [Trust model](../05_ctx/trust-model.md)
- [Privacy model](../07_security-and-privacy/privacy-model.md)
- [Share Capsules reference implementation](../03_architecture/share-capsules-reference-implementation.md)
