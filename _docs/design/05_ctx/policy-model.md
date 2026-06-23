# CTX Policy Model

Status: Accepted
Last updated: 2026-06-20

## Purpose

Define the V1 representation and evaluation boundaries for creator-signed Capsule access policy without prematurely building a general policy language.

## Design direction

A Capsule embeds a versioned structured JSON policy. Policy is declarative data, not source code, a template, or an expression evaluated with `eval` or another general-purpose runtime.

The signed Capsule manifest contains the complete policy. CTX Providers do not fetch a mutable remote policy or loosen its requirements. RFC 8785 canonical policy bytes and SHA-256 produce the policy digest bound into authorization requests and key-release tickets.

## V1 policy profile

V1 supports one policy profile with one combining rule: every listed requirement must be satisfied. It does not support arbitrary nesting, `any-of`, weighted scores, user-defined expressions, or executable extensions.

The profile contains these stable requirement types:

- Verified Share Capsules email
- Active, non-revoked account
- Registered, non-revoked Viewer device-key set
- Explicit consent to Capsule view-event accounting
- Optional creator-selected opening and closing instants for the Capsule revision
- Remaining capacity under an optional creator-configured lifetime view limit for the Capsule as a whole
- Remaining capacity under an optional creator-configured lifetime view limit for each account accessing that Capsule
- An optional current ecosystem automation-risk-not-high assertion

The first four requirements are mandatory in every valid V1 policy. The creator may configure an access-window start, end, or both; either lifetime limit; and the V1 automation-risk gate. Omitting creator gates does not disable separate Share Capsules operational abuse controls. V1 tooling emits the complete policy rather than asking creators to manipulate JSON or predicate identifiers.

## V1 representation

The exact schema, identifier spelling, canonical requirement order, value bounds, validation behavior, and digest construction are defined by [CTX Embedded Policy V1](../10_specifications/ctx/policy-v1.md). A complete policy may resemble:

```json
{
  "type": "ctx-policy",
  "version": 1,
  "combiner": "all",
  "requirements": [
    { "predicate": "ctx.account.email-verified", "equals": true },
    { "predicate": "ctx.account.active", "equals": true },
    { "predicate": "ctx.viewer.device-registered", "equals": true },
    { "predicate": "ctx.consent.capsule-view-event", "equals": true },
    {
      "predicate": "ctx.time.capsule-access-window",
      "not_before": "2026-07-01T05:00:00Z",
      "not_after": "2026-08-01T05:00:00Z"
    },
    {
      "predicate": "ctx.usage.capsule-lifetime-limit",
      "scope": "capsule",
      "maximum": 5
    },
    {
      "predicate": "ctx.usage.capsule-account-lifetime-limit",
      "scope": "account-and-capsule",
      "maximum": 3
    },
    {
      "predicate": "ctx.risk.ecosystem-automation-not-high",
      "issuer": "https://sharecapsules.com"
    }
  ]
}
```

The example dates, values `5` and `3`, and automation-risk requirement are illustrative, not platform defaults. Creator tooling interprets a selected calendar date in the creator's browser time zone: the opening date begins at local midnight, inclusively, and the closing date ends at the next local midnight, exclusively. It then signs the corresponding exact UTC instants. Omitting both boundaries means no creator-selected time restriction.

V1 lifetime maximums are positive safe JSON integers. Omission means the creator did not configure that gate; zero and `null` are not unlimited sentinels. Usage means a committed broker content-key release, not a page load or authorization attempt.

Reference Creator Studio represents omission with an empty field rather than a checkbox or sentinel value. It permits either limit independently. When both are supplied, it requires the Capsule-global total to be greater than or equal to the per-account value so the creator does not configure a per-account allowance already made unreachable by the shared total. Protocol validators still enforce each signed limit independently.

The per-account maximum applies to one persistent CTX account, not a verified unique human. Viewer and creator explanations must preserve that distinction.

## Predicate semantics

Every predicate identifier has versioned, provider-independent semantics describing:

- Required input type and parameters
- Scope
- Evaluation result type
- Freshness or time-window behavior
- Issuer or evidence requirements
- Disclosure and consent behavior
- Failure and unavailable-evidence behavior
- Human-readable explanation requirements

A provider may use its own internal implementation to establish a predicate, but it must not silently change the public meaning of a standardized identifier.

Unknown policy versions, combiners, predicates, operators, fields that alter meaning, malformed values, and unsupported required evidence fail closed before key release. The Viewer should identify unsupported requirements without exposing sensitive internal evaluation details.

## Evaluation

The Viewer first validates the policy structure and confirms it can explain and request consent for every requirement. The CTX Provider then evaluates the policy against current time, account, device, consent, and usage state.

Successful evaluation produces the short-lived authorization ticket. The ticket binds the exact policy digest so neither the Viewer nor broker can substitute a weaker policy between evaluation and key release. Authoritative access-window and global and per-account Capsule-limit enforcement occurs again during atomic ticket redemption.

## Extensibility

Future versions may add:

- Additional standardized or provider-qualified predicates
- Community credentials and contribution standing
- Account-continuity or creator-activity requirements
- Additional human-confidence, automation-risk, or personhood assertions
- `any-of`, threshold, or other carefully bounded combining rules
- Alternative verification paths

Adding future semantics requires an explicit policy-version or predicate-version decision. V1 parsers do not guess how to interpret future constructs. The versioned object and predicate registry preserve the intended ecosystem shape while V1 implements only one narrow profile.

## Related documents

- [CTX design intent](design-intent.md)
- [Trust model](trust-model.md)
- [Reputation and signals](reputation-and-signals.md)
- [Authorization and key release](authorization-and-key-release.md)
- [Capsule design intent](../04_capsule/design-intent.md)
- [V1 automation risk](automation-risk.md)
- [CTX Embedded Policy V1](../10_specifications/ctx/policy-v1.md)
