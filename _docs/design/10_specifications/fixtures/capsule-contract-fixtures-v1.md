# Capsule Contract Fixtures V1

Status: Experimental normative fixtures
Last updated: 2026-06-20

## Purpose

The [Capsule V1 fixture catalog](../../../../code/packages/test-fixtures/src/fixtures/capsule-contract-fixtures-v1.json) provides one language-neutral source of positive and negative contract inputs. TypeScript consumes it now; PHP and future implementations must consume the same JSON rather than translating the cases into separate language-owned fixture definitions.

These fixtures test structural, signature, archive-name, and encrypted-entry commitment boundaries. Deterministic byte-for-byte cryptographic outputs are published separately as cryptographic test vectors.

## Catalog identity

The root object contains:

- `fixture_set`: exactly `ctx-capsule-contract-fixtures`
- `version`: exactly `1`
- `payload_recipe`: a deterministic byte recipe for the committed encrypted entry
- `archive_entries`: the valid case-sensitive V1 archive-name set
- `base_manifest`: the valid Capsule Manifest V1 input shared by every case
- `cases`: uniquely identified positive and negative mutations

Unknown catalog versions are unsupported. Fixture IDs are stable within this version and MUST NOT be silently repurposed to test a different condition.

## Payload recipe

The V1 recipe `byte-sequence` produces a byte array of the declared `length`. Byte `i` equals `i mod modulus`. The valid manifest commits to the exact resulting bytes. This compact recipe avoids embedding a large opaque base64 value while remaining trivial to reproduce in any implementation language.

The recipe bytes are contract data used to test lengths and SHA-256 entry commitments. They are not claimed to be a valid encrypted image; authenticated-encryption and image-decoder vectors have their own inputs and outputs.

## Mutations

Manifest mutations use a deliberately small RFC 6901 JSON Pointer subset:

- `add`
- `remove`
- `replace`

The fixture runner applies the mutation to a fresh deep copy of `base_manifest`. It never mutates the authoritative catalog object.

Two layer-specific operations are also defined:

- `replace-archive-entries` replaces the actual case-sensitive archive entry-name list.
- `xor-payload-byte` XORs one payload byte at the specified zero-based offset with the specified mask.

A case contains either one `mutation` or an ordered `mutations` array. Mutation application itself is deterministic and must fail if a path, index, or payload offset is invalid.

## Classification and expected layer

Every case declares:

- A unique `id`
- One classification: `valid`, `malformed`, `tampered`, `oversized`, `downgraded`, or `unsupported`
- The first `validation_layer` expected to make the decision
- An `expected` result of `accept` or `reject`

V1 contains at least one case for every required classification. Negative cases cover mandatory-policy omission, path traversal, unknown fields, duplicate archive entries, signed-metadata tampering, encrypted-entry tampering, encoded and decoded resource limits, suite and signature-algorithm downgrade attempts, future format/profile/policy versions, and unsupported media.

The validation layers are:

- `complete-contract`: the positive baseline passes manifest parsing, creator signature verification, the exact archive allowlist, and encrypted-entry commitment validation.
- `manifest`: schema or semantic manifest validation rejects the case before authorization.
- `archive`: actual archive-name validation rejects the case before entry processing.
- `manifest-signature`: the mutated manifest remains structurally meaningful but no longer verifies against the baseline signature.
- `entry-commitment`: actual encrypted bytes no longer match the signed length or SHA-256 commitment.

Every negative case fails closed. A later layer MUST NOT reinterpret rejection at an earlier required layer as a recoverable warning.

## Cross-language use

Consumers should:

1. Parse the catalog as untrusted bounded JSON.
2. Verify the exact fixture-set identifier and version.
3. Confirm fixture IDs are unique and every supported classification is represented.
4. Validate `base_manifest` before applying mutations.
5. Deep-copy the base for each case.
6. Apply only the specified mutation vocabulary.
7. Assert the decision occurs at the declared validation layer.

The TypeScript materializer and immutable public catalog are exported by [`test-fixtures`](../../../../code/packages/test-fixtures/src/capsule/fixture-catalog-v1.ts). Its conformance tests are in [`fixture-catalog-v1.test.ts`](../../../../code/packages/test-fixtures/src/capsule/fixture-catalog-v1.test.ts).

## Related documents

- [Capsule Manifest V1](../capsule/manifest-v1.md)
- [Capsule Manifest Signature V1](../capsule/manifest-signature-v1.md)
- [Capsule Entry Commitments V1](../capsule/entry-commitments-v1.md)
- [Static Image Content Profile V1](../capsule/static-image-profile-v1.md)
- [V1 threat model](../../07_security-and-privacy/threat-model-v1.md)
