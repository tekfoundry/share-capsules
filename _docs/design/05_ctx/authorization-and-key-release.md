# CTX Authorization and Key Release

Status: Accepted
Last updated: 2026-06-20

## Purpose

Define the V1 authorization artifact and the boundary between CTX policy evaluation and the isolated key broker while preserving the intended multi-provider ecosystem.

## Design direction

CTX issues a signed, short-lived, single-use authorization ticket after a Viewer satisfies the embedded creator policy. The ticket is a portable protocol artifact that a creator-selected key broker can verify; it is not an OAuth access token, content key, or proof that plaintext was rendered.

V1 implements the final protocol shape with one statically accepted Share Capsules CTX Provider and one Share Capsules key broker. The provider-neutral discovery format and well-known derivation are defined now, while automatic trust of arbitrary discovered providers, multiple simultaneous brokers, offline authorization, and alternative ticket encodings are deferred.

The exact discovery objects, JWT fields, proof types, HPKE context bytes, and error codes are defined by [CTX Protocol Contracts V1](../10_specifications/ctx/protocol-contracts-v1.md).

## Ticket format

The V1 ticket is a compact JWT protected by JWS using Ed25519 and a CTX authorization-signing key dedicated to this purpose.

The protected header includes:

- A distinct media type such as `ctx-key-release+jwt`
- The fixed `EdDSA` algorithm identifier
- The issuer signing-key identifier

The claims bind at least:

- Issuer
- Exact key-broker audience
- Unique single-use ticket identifier
- Issued-at, not-before, and expiration times
- Capsule identifier and revision
- Embedded-policy digest
- Payload identifier
- Opaque broker release handle
- Permitted action, such as `render`
- Cryptographic-suite identifier
- Viewer Ed25519 proof-key thumbprint
- Viewer X25519 agreement-key identifier or thumbprint

The normal V1 lifetime is 60 seconds. The ticket contains no password, content key, recovery material, raw trust evidence, or public global account identifier. The issuer retains the private account and counter mapping associated with the ticket identifier.

JWT types used for OAuth, CTX authorization, or other purposes must have mutually exclusive validation rules. Implementations pin the token type, algorithm, issuer, audience, and accepted claims rather than trusting token-provided choices.

## Provider metadata

A CTX Provider exposes versioned metadata describing its issuer identifier, authorization endpoint, public authorization-signing keys, supported ticket profile, and redemption endpoint.

The V1 Viewer and broker use a statically configured Share Capsules issuer and audience, but they consume the same metadata and validation model expected of future compatible providers. Signing-key rotation must allow already issued tickets to verify during their short validity without accepting revoked or unknown keys indefinitely.

## Data flow

1. The Viewer verifies the Capsule, embedded policy, content profile, and device compatibility.
2. The viewer approves the required disclosure and view-event accounting.
3. The extension sends an authenticated authorization request to the CTX Provider using its DPoP-bound OAuth token and RFC 9449 proof.
4. The CTX Provider validates the account, registered device-key set, policy, consent, revocation state, creator-selected access window, and preliminary Capsule-global and per-account lifetime limits.
5. The CTX Provider records the pending single-use ticket and returns its signed JWT.
6. The extension presents the ticket and a fresh `ctx-key-release-proof+jwt` device proof, bound to the exact ticket hash and broker endpoint, to the ticket's named key broker.
7. The broker validates the JWS signature, token type, fixed algorithm, issuer, exact audience, time window, Capsule and payload bindings, and proof-key binding.
8. The broker prepares the content key wrapped to the ticket's X25519 agreement key using the V1 HPKE suite but does not return it yet.
9. The broker submits the ticket for online redemption. The issuer atomically revalidates ticket state, the creator-selected access window, and both creator-configured limits; marks the ticket consumed; and increments the Capsule-global and account-and-Capsule counters.
10. After successful redemption, the broker returns the prepared HPKE-wrapped content key.
11. The extension unwraps, decrypts, and renders for the current Viewer session.

The Host is absent from this flow and receives no ticket, account identifier, policy evidence, content key, or plaintext.

## Atomic redemption and counting

Ticket issuance performs a preliminary limit check for useful feedback. Redemption is authoritative. In one atomic operation the issuer must:

- Confirm the ticket exists, remains valid, and has not been consumed or revoked
- Recheck the account, device, Capsule-global limit, and per-account Capsule limit
- Mark the ticket consumed
- Increment the Capsule-global and account-and-Capsule lifetime counters

This final check prevents concurrent tickets from exceeding the creator's limit. Replaying a consumed ticket fails even before its expiration.

A view is counted when the broker commits an authorized release immediately before returning the wrapped key. The system cannot prove that the network response arrived or that pixels became visible. Counting only after a client acknowledgement would let a malicious Viewer retain the key while withholding acknowledgement. Product language and audit events should describe this as a committed key release rather than proof of human attention.

Expired authorization tickets and their replay-control artifacts are retained for no more than 24 hours. Identifiable committed-release event detail is retained for no more than 30 days. Capsule-global and per-account enforcement counters are state rather than an event history and persist only while required to enforce the active Capsule policy.

Denied, expired, revoked, malformed, or abandoned tickets that never redeem do not count. A transport failure after successful redemption may count because the release was already committed; this edge case is preferable to a client-controlled counting bypass.

## Security properties

- The issuer signature prevents claim modification.
- Exact audience binding prevents use at another broker.
- Short lifetime limits exposure.
- Stateful redemption provides true single-use behavior.
- The fresh Ed25519 proof demonstrates control of the registered Viewer installation.
- HPKE delivery ensures only the corresponding X25519 agreement key can recover the content key.
- Capsule, revision, policy, payload, action, and suite bindings prevent cross-context substitution.
- Issuer-side ticket mapping avoids disclosing the global Share Capsules account identifier to the broker.

The ticket does not make an untrusted Viewer invulnerable, prove that rendering occurred, or prevent an authorized user from recording visible content.

## Ecosystem alignment

The signed ticket is slightly more work than an opaque V1 token, but it avoids defining authorization as a private call between one permanent service and one permanent broker. A future creator-selected broker can validate the issuer and authorization claims using provider metadata while still using online redemption for counters and replay prevention.

The V1 implementation should place ticket issuance, validation, and redemption behind explicit interfaces. It should not build dynamic federation before another provider exists, but its stored data and public messages should not require replacement when one does.

## Standards references

- [RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519)
- [RFC 8037: Ed25519 in JOSE](https://www.rfc-editor.org/rfc/rfc8037)
- [RFC 8725: JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725)
- [RFC 9449: OAuth DPoP](https://www.rfc-editor.org/rfc/rfc9449)

## Related documents

- [CTX design intent](design-intent.md)
- [Trust model](trust-model.md)
- [Access and data flow](../03_architecture/access-and-data-flow.md)
- [Key management](../03_architecture/key-management.md)
- [V1 cryptographic suite](../07_security-and-privacy/cryptographic-suite-v1.md)
