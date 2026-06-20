# CTX Embedded Policy V1

Status: Experimental normative contract
Last updated: 2026-06-20

## Scope

This specification defines the complete CTX policy object embedded in a Capsule format `1.0` manifest. It intentionally defines one narrow, provider-independent access-policy profile rather than a general policy language.

The machine-readable schema is [`ctx-policy-v1.schema.json`](../../../../code/packages/capsule-core/src/schema/ctx-policy-v1.schema.json). Implementations MUST apply the semantic validation in this specification in addition to JSON Schema validation.

## Policy object

A V1 policy MUST contain exactly these top-level fields:

```json
{
  "type": "ctx-policy",
  "version": 1,
  "combiner": "all",
  "requirements": []
}
```

- `type` MUST equal `ctx-policy`.
- `version` MUST equal the JSON number `1`.
- `combiner` MUST equal `all`.
- `requirements` MUST contain each mandatory requirement and MAY contain the optional creator gates defined below.
- No other top-level or requirement fields are permitted.

The `all` combiner means that every listed requirement MUST evaluate successfully before authorization. V1 does not support nesting, alternatives, thresholds, weighted scores, expressions, executable code, or provider-defined extensions.

## Requirements and canonical order

Requirements MUST appear at most once and in the following order. The first four are mandatory. Optional entries retain their position relative to this list when present.

1. `ctx.account.email-verified`
2. `ctx.account.active`
3. `ctx.viewer.device-registered`
4. `ctx.consent.capsule-view-event`
5. `ctx.usage.capsule-lifetime-limit` (optional)
6. `ctx.usage.capsule-account-lifetime-limit` (optional)
7. `ctx.risk.ecosystem-automation-not-high` (optional)

Canonical ordering gives one array representation to one V1 policy meaning. A parser MUST reject missing mandatory requirements, duplicate requirements, unknown predicates, and out-of-order requirements.

### Mandatory account, device, and consent requirements

Every V1 policy MUST begin with these exact objects:

```json
[
  { "predicate": "ctx.account.email-verified", "equals": true },
  { "predicate": "ctx.account.active", "equals": true },
  { "predicate": "ctx.viewer.device-registered", "equals": true },
  { "predicate": "ctx.consent.capsule-view-event", "equals": true }
]
```

The CTX Provider MUST establish that the requesting account has a verified email address, the account is active and not revoked, the proof is bound to an active registered Viewer device-key set, and the viewer has consented to the Capsule view event used for authorization and release accounting.

These predicates describe account and device state. They do not establish that an account represents one unique human.

### Optional Capsule lifetime limit

```json
{
  "predicate": "ctx.usage.capsule-lifetime-limit",
  "scope": "capsule",
  "maximum": 5
}
```

`maximum` MUST be a positive safe JSON integer from `1` through `9007199254740991`. The creator selects the value. There is no protocol default. Omitting this requirement means the creator has not configured this gate; a sentinel such as zero or `null` MUST NOT represent unlimited access.

The limit applies to committed content-key releases across all accounts for the exact Capsule revision. Authoritative enforcement and counter increment occur atomically during broker ticket redemption. Page loads, authorization attempts, denied requests, and unredeemed tickets do not consume the limit. A committed release remains counted if the response is subsequently lost.

### Optional account-and-Capsule lifetime limit

```json
{
  "predicate": "ctx.usage.capsule-account-lifetime-limit",
  "scope": "account-and-capsule",
  "maximum": 3
}
```

`maximum` has the same positive-safe-integer rules as the Capsule lifetime limit. It applies independently to committed releases for one persistent CTX account and the exact Capsule revision. It is not a per-person limit and does not make a personhood claim.

### Optional ecosystem automation-risk gate

```json
{
  "predicate": "ctx.risk.ecosystem-automation-not-high",
  "issuer": "https://trust.example"
}
```

`issuer` identifies the accepted issuer of a current automation-risk assertion. It MUST be an absolute HTTPS URL of at most 2,048 characters and MUST NOT contain user information, a query, or a fragment. The issuer MAY be different from the CTX Provider or Key Broker.

This predicate asks whether current, privacy-bounded evidence indicates high automation risk. It does not certify personhood, biometric identity, or a permanent global trust score. The assertion format, freshness, and issuer discovery binding are defined with the CTX authorization contracts.

## Canonical bytes and digest

The policy MUST first pass complete V1 structural and semantic validation. Its canonical bytes are then its RFC 8785 JSON Canonicalization Scheme representation encoded as UTF-8. The policy digest is:

```text
base64url-no-pad(SHA-256(canonical-policy-bytes))
```

Authorization requests and key-release tickets bind this digest so a Viewer, provider, or broker cannot substitute a weaker policy between signed-Capsule verification and content-key release.

## Evaluation and failure behavior

The Viewer MUST validate and explain every requirement before sending account credentials, device proof, or consent evidence. The CTX Provider evaluates current account, device, consent, usage, and assertion state. The broker repeats authoritative limit and revocation checks during atomic redemption.

Malformed or unsupported policy versions, combiners, predicates, fields, values, issuers, or operators MUST fail closed before key release. A Viewer SHOULD present a stable privacy-safe failure category without disclosing raw trust history or sensitive evaluation inputs to the Host or creator.

Omitting optional creator gates does not disable operational abuse controls applied by a provider or broker outside the creator-signed policy.

## Extensibility

Future predicates or combining behavior require an explicit versioned specification. A V1 parser MUST NOT infer the meaning of future constructs. Creator tooling SHOULD present supported choices in human language and emit the exact policy object; creators should not need to author predicate identifiers manually.

## Conformance implementation

The reference implementation exports the V1 types, constants, parser, canonicalizer, and digest from [`capsule-core`](../../../../code/packages/capsule-core/src/policy.ts). Positive and negative contract tests are maintained in [`ctx-policy-v1.test.ts`](../../../../code/packages/test-fixtures/src/capsule/ctx-policy-v1.test.ts).

## Related documents

- [CTX policy design intent](../../05_ctx/policy-model.md)
- [CTX trust model](../../05_ctx/trust-model.md)
- [Authorization and key release](../../05_ctx/authorization-and-key-release.md)
- [V1 automation risk](../../05_ctx/automation-risk.md)
- [Capsule Manifest V1](../capsule/manifest-v1.md)
