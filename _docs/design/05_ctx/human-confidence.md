# Human Confidence

Status: Draft
Last updated: 2026-06-25

## Purpose

Define what CTX can responsibly claim about human participation and how confidence may be strengthened without equating humanity with identity or benign intent.

## Distinct questions

The design must distinguish:

- **User presence** — someone or something completed an interaction.
- **Account continuity** — the same credential or account returned.
- **Human confidence** — evidence is consistent with ongoing human control.
- **Unique personhood** — a provider believes one natural person enrolled only once.
- **Identity verification** — a provider connected the person to validated legal identity.
- **Benign intent** — the viewer will respect the creator's wishes.

Evidence for one question does not automatically answer the others.

## Confidence over time

Human confidence is expected to emerge from layered evidence rather than one test:

- Persistent account history
- Natural variation in Capsule-session activity
- Community relationships and contribution
- Creator activity recognized by others
- Stable credentials and reasonable device transitions
- Absence of abusive concurrency or volume
- Recent step-up challenge results
- Optional personhood credentials

Long-term reputation makes disposable automated accounts more expensive, but sleeper accounts, rented accounts, human farms, and compromised accounts remain possible.

## Biometrics and passkeys

Passkeys can provide strong account authentication and local user verification. They do not prove that an account is unique to one natural person.

Biometric or identity proofing may be offered by specialist providers as higher-assurance evidence. CTX services should receive a narrow credential rather than raw facial images, fingerprints, identity documents, or biometric templates.

Creators may select an assurance requirement. Legal identity or biometric enrollment is not currently intended as a universal prerequisite for a basic Share Capsules account.

## Behavioral evidence

Mouse movement, scrolling, touch, keyboard use, dwell time, focus, navigation, and request patterns may contribute to session assessment. They are probabilistic and gameable.

The absence of mouse behavior must not be treated as evidence of automation. The system must accommodate touch-only users, keyboard navigation, assistive technology, motor differences, and unusual but legitimate behavior.

V1 does not collect these passive interaction signals. Its automation-risk gate uses CTX authorization and committed-release metadata only and must not be described as proof of human presence. See [V1 automation risk](automation-risk.md).

## Step-up challenges

When available evidence is insufficient, CTX may request additional verification:

- Passive browser or device checks
- Accessible interactive challenges
- Credential presentation
- Community or creator approval
- Higher-assurance personhood verification

A completed CAPTCHA, math problem, or graphical puzzle is short-lived session evidence. It must not grant substantial permanent reputation because automated systems and paid human solvers can complete challenges.

Repeated failure should offer alternate methods when practical rather than permanently labeling the account as non-human.

### V1 challenge-score direction

The V1 Trust Capsule direction is to treat challenges as one independent score component rather than as proof of human identity. A challenge flow may present several accessible mini-challenges, such as four selected from a larger rotating pool, with each challenge producing a bounded score. The completed challenge scores are averaged into a `challenge_score` from `0` to `100`, where `100` is the strongest recent challenge result and `0` is the default when the viewer has no current completed challenge.

The challenge system should be extensible. Individual challenges are versioned modules selected from a provider-controlled challenge registry rather than permanent hard-coded requirements. The provider may add, retire, disable, or reweight challenges as bots adapt, accessibility review improves, or abuse evidence changes. Stored results must record the challenge identifiers, challenge versions, challenge-set version, and scoring-model version so old results remain explainable after the active challenge pool changes.

In V1, challenge modules should be hosted and scored by the CTX Provider rather than canonically shipped inside the Viewer extension. The Viewer extension launches the trusted provider challenge flow when CTX returns `challenge_required`, carries enough state to resume the original Capsule opening after success, and keeps the Host outside the challenge evidence path. Provider ownership lets the active challenge pool evolve without requiring extension releases while preserving versioned scoring, auditability, and central replay resistance.

### Provider-side challenge registry

The CTX Provider maintains a private challenge registry that defines which challenge modules may be selected for new attempts. The registry is operational configuration and provider implementation, not creator-authored policy code. It must be auditable, versioned, and safe to change without invalidating historical challenge results.

Each challenge module definition includes:

- Stable challenge identifier, such as `circuit_trace`
- Semantic module version
- Lifecycle status: `draft`, `active`, `disabled`, or `retired`
- Supported input modes, such as pointer, touch, keyboard, screen reader, or reduced motion
- Accessibility review status and known limitations
- Safe event schema version for derived interaction features
- Scoring adapter identifier and version
- Weight or selection bucket used by the challenge-set selector
- Minimum and maximum expected duration boundaries for impossible-timing detection
- Operational notes for emergency disablement

Lifecycle status has specific meaning:

- `draft` modules are unavailable to ordinary challenge attempts and may be used only in internal testing.
- `active` modules may be selected for new attempts.
- `disabled` modules are temporarily excluded from new attempts but their historical results remain explainable.
- `retired` modules are permanently excluded from new attempts but retained in registry history while any audit, appeal, or retained challenge result may reference them.

The challenge-set selector chooses the required modules from the current active registry using a server-side random source. V1 may begin with four modules per attempt selected from a larger active pool. Selection should avoid presenting two modules that depend on the same inaccessible input mode when alternatives are available. A challenge attempt records the selected module identifiers, module versions, selector version, challenge-set version, and scoring-model version before the page is rendered, so replayed or resumed attempts cannot silently switch modules.

Scoring is module-local first and aggregate second. Each module returns a bounded score from `0` to `100` plus reviewed reason categories or derived feature summaries needed for explanation and abuse review. The challenge orchestrator combines completed module scores into the attempt-level `challenge_score`, initially by averaging equally weighted required modules unless a scoring-model version defines a different reviewed weighting. Missing, abandoned, expired, or replayed module completions do not receive hidden partial credit.

Registry changes are forward-looking. Adding, disabling, retiring, or reweighting modules affects new challenge attempts only. Existing challenge results continue to be evaluated under the challenge-set and scoring-model versions recorded at attempt creation. Emergency disablement may prevent a module from being used in new attempts immediately, but it must not rewrite historical scores without an explicit correction or appeal process.

### Provider-hosted challenge contract

When a Trust Capsule policy is otherwise eligible but the final Trust Capsule outcome is `challenge_required`, the CTX Provider returns the privacy-safe `challenge_required` error to the Viewer. The response does not contain raw scores, thresholds, account history, challenge results, or Host-readable evidence. The trusted Viewer may then start a separate provider-hosted challenge attempt.

A challenge attempt is created by an authenticated Viewer request to the CTX Provider. The request is bound to the same account, registered Viewer device, Host site, Capsule identifier and revision, embedded policy digest, broker, payload, release handle, and intended action as the original authorization request. The provider records an opaque challenge-attempt identifier, active challenge-set version, selected challenge module identifiers and versions, scoring-model version, issued time, expiration time, and replay state. Attempt identifiers are not CTX authorization tickets and cannot release keys.

The provider-hosted challenge page runs on the CTX Provider origin. It may be opened by the extension in a trusted tab, window, or extension-controlled surface, but the Host page must not receive the challenge attempt, challenge results, raw interaction evidence, final score, or retry details. The extension stores only the minimum resume state required to repeat the original Capsule authorization after a successful challenge, and that resume state expires with the challenge attempt.

Successful completion stores a temporary challenge result containing `challenge_score`, `last_challenged_at`, `challenge_expires_at`, the scoring and challenge-set versions, binding scope, and minimal audit fields. V1 should treat a successful result as short-lived; the exact TTL is an operational tuning value, but it must be long enough to resume the interrupted Capsule opening and short enough that the result does not become durable reputation. A default on the order of minutes to hours is acceptable for V1 calibration; longer reuse requires explicit review.

Standing consent to Capsule view-event accounting does not silently authorize challenge telemetry beyond the challenge purpose. The challenge flow should present its own concise disclosure when additional interaction evidence is measured, retained, or used for scoring. Refusing or abandoning the challenge leaves the Capsule locked without creating a committed key release.

After success, the extension repeats the original CTX authorization request. The provider reevaluates the full policy, current usage score, current challenge result, Capsule revocation state, and limits before issuing a ticket. At broker redemption, the provider rechecks the final Trust Capsule outcome where required so stale challenge results, expired bindings, concurrent tickets, or newly severe usage risk cannot bypass enforcement.

Failures remain privacy-safe:

- `challenge_required` means a current step-up result is needed.
- `automation_risk_high` means recent severe usage risk blocks access even if a challenge is attempted.
- `policy_unsatisfied` means another signed policy requirement or binding failed.
- `temporarily_unavailable` means provider-side challenge or scoring infrastructure could not make a reliable decision.

Challenge results expire and must be periodically refreshed. Stored challenge evidence should include `last_challenged_at`, `challenge_expires_at`, the scoring model or challenge-set version, and the account, device, site, policy, or Capsule context to which the result is bound. The current, expired, or absent status is derived from those timestamps rather than stored as a separate confidence field.

Challenge refresh cadence may become progressive without changing the creator-facing Trust Capsule control. New or unproven viewers start on a standard freshness window, such as 7 days. A viewer may move to an extended freshness window, such as 30 days, after a reviewed number of consecutive successful challenge windows with no high automation-risk decision and no reset-worthy suspicious usage or low challenge result. The V1 reference threshold is five consecutive clean successful challenge windows before moving from standard to extended cadence.

Progressive cadence must use aggregate provider-private state rather than durable raw challenge history. Suitable fields include `challenge_success_streak`, `challenge_refresh_tier`, `last_challenge_score`, `last_challenged_at`, `challenge_expires_at`, and `last_reset_reason`. Low challenge scores, failed or abandoned checks, expired checks that are not renewed when required, suspicious low-confidence usage signals, and any active high automation-risk result reset the cadence to the standard window. High automation risk remains a hard block even when a viewer has earned an extended challenge refresh cadence.

Challenge design must provide multiple accessible paths rather than relying on one brittle puzzle type. It should avoid durable biometric-style telemetry, long-lived raw pointer traces, plaintext Capsule content, secrets, complete session replay, or unnecessary behavioral data. Raw interaction details should be discarded after score derivation unless a minimal, documented audit record is required.

A successful challenge may raise confidence for a low-history or ambiguous viewer, but it must not override active severe usage risk. A viewer whose recent account behavior indicates high automation risk remains blocked even if a challenge is completed.

## Assurance model

A provisional model is:

```text
Level 1 — user-present
Level 2 — persistent account with established human-consistent history
Level 3 — unique-person credential from an accepted provider
Level 4 — verified legal identity from an accepted provider
```

These levels describe different assurance sources and may not form a simple hierarchy in the final protocol.

## Claims CTX should avoid

CTX should not claim:

- A human-confidence score proves a natural person is present
- A verified person will not harvest content
- A successful CAPTCHA proves humanity
- A biometric credential proves only one account exists everywhere
- A low score proves malicious intent

## Open questions

- Does CTX standardize assurance levels or only credential semantics?
- How can unique-person verification remain pseudonymous to creators?
- How are duplicate enrollments, recovery, and account replacement handled?
- Which accessible step-up methods should V1 support?
- How much human-confidence evidence can be computed locally?

## Related documents

- [Trust model](trust-model.md)
- [Reputation and signals](reputation-and-signals.md)
- [Privacy model](../07_security-and-privacy/privacy-model.md)
- [V1 automation risk](automation-risk.md)
