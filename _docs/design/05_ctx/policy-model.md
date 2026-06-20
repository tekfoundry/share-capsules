# CTX Policy Model

Status: Draft
Last updated: 2026-06-19

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
- Remaining capacity under an optional creator-configured lifetime view limit for the Capsule as a whole
- Remaining capacity under an optional creator-configured lifetime view limit for each account accessing that Capsule
- An optional current ecosystem automation-risk-not-high assertion

The first four requirements are mandatory in every valid V1 policy. The creator may configure either lifetime limit, both, or neither, and may require the V1 automation-risk gate. Omitting creator gates does not disable separate Share Capsules operational abuse controls. V1 tooling emits the complete policy rather than asking creators to manipulate JSON or predicate identifiers.

## Conceptual representation

The exact schema and identifier spelling belong in the specification, but the structure should resemble:

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

The example values `5` and `3` are illustrative, not platform defaults. The creator selects each value independently. The automation-risk requirement is also optional and identifies the accepted assertion issuer.

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

The Viewer first validates the policy structure and confirms it can explain and request consent for every requirement. The CTX Provider then evaluates the policy against current account, device, consent, and usage state.

Successful evaluation produces the short-lived authorization ticket. The ticket binds the exact policy digest so neither the Viewer nor broker can substitute a weaker policy between evaluation and key release. Authoritative global and per-account Capsule-limit enforcement occurs again during atomic ticket redemption.

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
