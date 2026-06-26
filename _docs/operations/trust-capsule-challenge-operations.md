# Trust Capsule Challenge Operations

Status: Draft for Phase 9 local validation
Last updated: 2026-06-25

This runbook records the operational tuning surface for Trust Capsule challenge behavior. It is intentionally conservative: changing a challenge threshold, challenge lifetime, active module, or automation-risk boundary changes who can open protected content and must be treated as a policy change, not a cosmetic configuration edit.

## Current V1 Defaults

| Area | Current value | Implementation source | Operational meaning |
|---|---:|---|---|
| Passing Trust Capsule score | `70` | `TrustCapsuleOutcomeCombiner::DEFAULT_PASSING_SCORE` | A current challenge score below this remains `challenge_required` for low-confidence usage cases. |
| Active challenge modules required per attempt | `1` | `StaticChallengeRegistry::requiredModuleCount()` | V1 currently proves the path with Circuit Trace only before broadening the pool. |
| Active challenge module | `circuit_trace` | `StaticChallengeRegistry::activeModules()` | The only module selected for ordinary attempts in V1 local validation. |
| Challenge attempt lifetime | `10 minutes` | `ChallengeAttemptOrchestrator::ATTEMPT_LIFETIME_MINUTES` | The viewer must complete the launched challenge before this expires. |
| Challenge evidence retention after expiry | `24 hours` | `ChallengeAttemptOrchestrator::RETENTION_AFTER_EXPIRY_HOURS` | Expired attempts remain briefly for replay/failure handling and then prune. |
| Automation-risk assessment lifetime | `60 seconds` | `V1AutomationRiskRules::ASSESSMENT_LIFETIME_SECONDS` | Stored usage assessments are short-lived; authorization and redemption recompute current state. |
| Automation-risk activity windows | `300 seconds` | `V1AutomationRiskRules` | Recent authorization, release, rejection, and pending-ticket evidence windows. |
| Authorization-attempt high-risk boundary | `300` attempts/window | `V1AutomationRiskRules::AUTHORIZATION_ATTEMPT_LIMIT` | Conservative obvious-automation threshold. |
| Committed-release high-risk boundary | `120` releases/window | `V1AutomationRiskRules::COMMITTED_RELEASE_LIMIT` | Conservative obvious bulk-opening threshold. |
| Distinct-Capsule spread boundary | `50` Capsules/window | `V1AutomationRiskRules::DISTINCT_CAPSULE_LIMIT` | Detects broad harvesting across many Capsules. |
| Ticket-rejection misuse boundary | `50` rejections/window | `V1AutomationRiskRules::TICKET_REJECTION_LIMIT` | Counts replayed or expired ticket misuse only. |
| Pending-ticket concurrency boundary | `50` pending tickets | `V1AutomationRiskRules::PENDING_TICKET_LIMIT` | Blocks excessive outstanding release authority. |

These values are not exposed to Hosts or creators. Viewer and creator language must remain qualitative and privacy-safe.

## Safe Tuning Rules

- Do not lower or raise challenge passing score, challenge TTL, active module count, or automation-risk boundaries directly in production without a reviewed code release.
- Every tuning change must update the versioned source constant, the relevant tests, this runbook, and any deployment ledger entry.
- Any change that affects challenge selection, scoring weight, or module lifecycle must advance the challenge-set, selector, or scoring-model version as appropriate.
- A successful challenge must remain short-lived step-up evidence. Extending challenge reuse beyond minutes or a small number of hours requires privacy and abuse review.
- A challenge success must never override active severe usage risk.
- A provider outage, scoring outage, or insufficient active challenge pool must fail closed as `temporarily_unavailable` or `policy_unsatisfied`, not silently allow access.

## Emergency Disablement

Use emergency disablement when a challenge module has an accessibility defect, scoring bug, replay weakness, or active bypass.

1. Stop selecting the affected module for new attempts by moving it out of the active registry pool.
2. If the active pool would become smaller than the required module count, disable new Trust Capsule challenge issuance and fail safely rather than falling back to an unreviewed module.
3. Preserve existing attempt rows for the ordinary retention window so replay and incident review remain possible.
4. Do not rewrite historical scores unless a separate correction or appeal process is approved.
5. Re-enable only after calibration fixtures, accessibility coverage, replay tests, and safe-error tests pass for the replacement module set.

## Verification Before Enabling A Module By Default

Each challenge module must have:

- accessible pointer, touch, keyboard, and reduced-motion or equivalent paths where applicable
- bounded `0` to `100` scoring with reviewed reason categories
- replay, expiry, and duplicate-completion tests
- calibration fixtures for normal, failed, impossible-fast, and alternate-input paths
- retention coverage showing no raw pointer traces, complete session replay, Capsule plaintext, secrets, or biometric-style data are stored
- safe failure behavior when module scoring cannot complete reliably

Circuit Trace is the first active module because these paths are now covered for the V1 slice.
