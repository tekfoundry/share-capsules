# CTX Protocol Contracts V1

Status: Experimental normative contract
Last updated: 2026-06-20

## Scope

This specification defines provider-neutral CTX V1 discovery metadata, authorization-ticket claims, OAuth DPoP proof restrictions, broker ticket proof, HPKE key-release context, response envelope, and privacy-safe errors.

The machine-readable schemas are maintained in [`ctx-contracts-v1.schema.json`](../../../../code/packages/ctx-client/src/schema/ctx-contracts-v1.schema.json). JSON Schema validation is necessary but not sufficient; implementations MUST also apply the identity, time, audience, freshness, uniqueness, and context checks described here.

Share Capsules is the first configured implementation of these contracts. V1 defines interoperable messages and identities but does not provide an open provider marketplace, automatic trust of arbitrary issuers, or dynamic federation policy.

## Common rules

- The protocol version identifier is `ctx-1`.
- The Capsule cryptographic-suite identifier is `ctx-capsule-v1`.
- Service identities and endpoints MUST be absolute HTTPS URLs of at most 2,048 characters without user information, a query, or a fragment.
- A response identity MUST exactly match the identity used to request its discovery document.
- Unknown fields, versions, algorithms, ticket types, suites, claims, or error codes fail closed.
- V1 opaque identifiers contain 16–128 ASCII letters, digits, `_`, or `-`.
- SHA-256 values and JWK thumbprints use unpadded base64url and contain exactly 43 characters.
- Network retrieval MUST use bounded redirects, sizes, reads, and timeouts and MUST revalidate every redirect target. Protocol validation does not replace transport and SSRF protections.

## Discovery

CTX uses the RFC 8414 well-known insertion rule with the project suffix `ctx-configuration`.

```text
identity:  https://trust.example
metadata:  https://trust.example/.well-known/ctx-configuration

identity:  https://trust.example/tenant
metadata:  https://trust.example/.well-known/ctx-configuration/tenant
```

Discovery uses an unauthenticated `GET`. Credentials, device proofs, account identifiers, or tickets MUST NOT be sent to a discovered endpoint until the signed Capsule, service identity, metadata shape, expected identity, and locally accepted provider configuration have all been validated.

### CTX Provider metadata

```json
{
  "issuer": "https://trust.example/tenant",
  "protocol_versions_supported": ["ctx-1"],
  "authorization_endpoint": "https://trust.example/tenant/authorize",
  "ticket_redemption_endpoint": "https://trust.example/tenant/redeem",
  "jwks_uri": "https://trust.example/tenant/jwks.json",
  "ticket_types_supported": ["ctx-key-release+jwt"],
  "ticket_signing_alg_values_supported": ["EdDSA"],
  "dpop_signing_alg_values_supported": ["EdDSA"]
}
```

V1 requires every singleton capability exactly as shown. The `issuer` MUST exactly equal the Capsule's validated `ctx.issuer` identity.

The JWKS contains 1–16 public ticket-signing keys. Each key contains exactly `kty: "OKP"`, `crv: "Ed25519"`, a 32-byte public `x`, `use: "sig"`, `alg: "EdDSA"`, and a unique opaque `kid`. Private `d` values and unrelated key types are prohibited.

The issuer SHOULD publish a new key before using it. A retiring public key remains available long enough to validate already-issued tickets through their 60-second validity and accepted clock skew. An unknown `kid` MAY cause one bounded metadata/JWKS refresh; it MUST NOT cause acceptance of an untrusted key or indefinite retries. Emergency key revocation may invalidate outstanding tickets.

### Key Broker metadata

```json
{
  "broker": "https://broker.example",
  "protocol_versions_supported": ["ctx-1"],
  "key_release_endpoint": "https://broker.example/releases",
  "ticket_types_supported": ["ctx-key-release+jwt"],
  "cryptographic_suites_supported": ["ctx-capsule-v1"]
}
```

The `broker` MUST exactly equal the signed payload `key_release.broker` identity. The Viewer validates provider and broker identities independently even when one operator supplies both roles.

## Authorization ticket

The CTX Provider returns a compact JWT protected with JWS Ed25519 using a dedicated authorization-signing key. Its protected header contains exactly:

```json
{ "typ": "ctx-key-release+jwt", "alg": "EdDSA", "kid": "provider-signing-key-id" }
```

OAuth access tokens, DPoP proofs, broker proofs, and CTX tickets have mutually exclusive types, keys, claims, and validation rules.

The payload contains exactly this shape:

```json
{
  "iss": "https://trust.example/tenant",
  "aud": "https://broker.example",
  "jti": "single-use-ticket-id",
  "iat": 1750000000,
  "nbf": 1750000000,
  "exp": 1750000060,
  "ctx": {
    "version": 1,
    "capsule_id": "urn:uuid:123e4567-e89b-42d3-a456-426614174000",
    "capsule_revision": 1,
    "policy_sha256": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "payload_id": "primary-image",
    "release_handle": "opaque-broker-release-handle",
    "action": "render",
    "cryptographic_suite": "ctx-capsule-v1",
    "proof_jkt": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "agreement_jkt": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  }
}
```

- `iss` exactly matches the accepted provider identity.
- `aud` is one string and exactly matches the signed and discovered broker identity.
- `jti` is an unpredictable unique single-use identifier retained as pending issuer state.
- `nbf` is less than or equal to `iat`.
- `exp` equals `iat + 60` seconds. Validators MAY accept at most five seconds of configured clock skew when checking current validity; skew does not permit a longer signed lifetime.
- `policy_sha256` is the digest of the fully validated embedded policy.
- `proof_jkt` is the RFC 7638 SHA-256 JWK thumbprint of the registered Ed25519 Viewer proof key.
- `agreement_jkt` is the RFC 7638 SHA-256 JWK thumbprint of the registered X25519 Viewer agreement key.
- `release_handle` exactly equals the opaque handle in the signed Capsule payload. Binding it prevents selection of another broker-held key record.

The ticket MUST NOT contain an account identifier, subject claim, password, content key, raw trust evidence, score, global history, or recovery material. The issuer privately maps `jti` to the account, device, policy decision, and pending counter transaction required for redemption.

Signature verification, header validation, issuer selection, exact audience, current time, pending state, Capsule/payload/release bindings, policy digest, action, suite, and both device thumbprints MUST all succeed. Claim parsing alone never authorizes release.

## OAuth DPoP proof

Authorization API calls use OAuth DPoP as profiled by RFC 9449. The access token uses the `DPoP` authentication scheme and the proof is carried in the `DPoP` header.

V1 narrows the protected-call proof header to:

```json
{
  "typ": "dpop+jwt",
  "alg": "EdDSA",
  "jwk": { "kty": "OKP", "crv": "Ed25519", "x": "..." }
}
```

The public JWK has no private or unrelated fields. Its RFC 7638 thumbprint matches the access token's `cnf.jkt` and the registered device proof key.

The claims contain exactly `jti`, `htm`, `htu`, `iat`, `ath`, and an optional server-provided `nonce`. V1 CTX protected operations use `POST`. `htu` exactly identifies the HTTPS target without query or fragment. `ath` is the unpadded base64url SHA-256 hash of the ASCII access-token value. The proof is accepted for at most 60 seconds with at most five seconds of clock skew, is unique per HTTP request, and is subject to replay detection. When a server provides `DPoP-Nonce`, the retried proof contains that exact nonce.

DPoP proves possession and sender-constrains the OAuth token; it is not account authentication or authorization by itself.

## Broker ticket proof

The broker request does not reinterpret the OAuth-specific DPoP `ath` claim. It uses a separate compact JWS proof signed by the same registered Ed25519 device proof key.

```json
{
  "typ": "ctx-key-release-proof+jwt",
  "alg": "EdDSA",
  "jwk": { "kty": "OKP", "crv": "Ed25519", "x": "..." }
}
```

The claims contain exactly `jti`, `htm: "POST"`, `htu`, `iat`, `tth`, and an optional server nonce. `tth` is the unpadded base64url SHA-256 hash of the ASCII compact CTX ticket. The proof-key thumbprint equals the ticket's `ctx.proof_jkt`. Endpoint, freshness, uniqueness, nonce, ticket hash, signature, and ticket validity are all required. A ticket or proof cannot substitute for the other.

## HPKE content-key delivery

The broker uses RFC 9180 base mode and the `ctx-capsule-v1` HPKE parameters: X25519, HKDF-SHA-256, and AES-256-GCM. The 32-byte Capsule content key is the HPKE plaintext.

The canonical context object is:

```json
{
  "type": "ctx-key-release-context",
  "version": 1,
  "broker": "https://broker.example",
  "ticket_jti": "single-use-ticket-id",
  "capsule_id": "urn:uuid:123e4567-e89b-42d3-a456-426614174000",
  "capsule_revision": 1,
  "payload_id": "primary-image",
  "release_handle": "opaque-broker-release-handle",
  "action": "render",
  "cryptographic_suite": "ctx-capsule-v1",
  "agreement_jkt": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
}
```

The HPKE `info` bytes are:

```text
UTF8("CTX-Key-Release-HPKE-v1\0") || RFC8785(context)
```

The authenticated additional data bytes are:

```text
UTF8("CTX-Key-Release-AAD-v1\0") ||
RFC8785({"ticket_sha256": base64url-no-pad(SHA-256(ASCII(compact-ticket)))})
```

Together, `info`, AAD, and the signed ticket bind the wrapped key to the broker, authorization, Capsule revision, policy, payload, release handle, action, suite, proof key, and agreement key.

After successful atomic online redemption, the broker returns:

```json
{
  "type": "ctx-key-release",
  "version": 1,
  "ticket_jti": "single-use-ticket-id",
  "cryptographic_suite": "ctx-capsule-v1",
  "enc": "base64url-32-byte-encapsulated-key",
  "ciphertext": "base64url-48-byte-encrypted-content-key-and-tag"
}
```

The Viewer confirms the response ticket and suite before opening. HPKE authentication failure, an all-zero or malformed agreement result, wrong lengths, or context mismatch fails closed without payload decryption.

## Privacy-safe error envelope

Protocol APIs return only this machine-readable shape:

```json
{
  "type": "ctx-error",
  "version": 1,
  "code": "consent_required",
  "retryable": false,
  "correlation_id": "optional-opaque-correlation-id"
}
```

V1 codes are `invalid_request`, `authentication_required`, `email_verification_required`, `account_unavailable`, `device_registration_required`, `consent_required`, `policy_unsatisfied`, `capsule_limit_reached`, `account_capsule_limit_reached`, `automation_risk_high`, `unsupported_contract`, `invalid_proof`, `invalid_ticket`, `ticket_expired`, `ticket_replayed`, `release_unavailable`, and `temporarily_unavailable`.

The envelope contains no free-form detail, account identifier, score, threshold, history, token, key, Capsule plaintext, or internal exception. The trusted Viewer maps codes to reviewed localized explanations. The Host receives only a generic locked, unavailable, or unsupported lifecycle state and MUST NOT receive the protocol error body.

`retryable` indicates whether a later fresh interaction may be useful; it never instructs a client to replay the same ticket or proof. Clients apply bounded backoff and user-action rules appropriate to the code.

## Conformance implementation

The provider-neutral reference validators and HPKE context builders are exported by [`ctx-client`](../../../../code/packages/ctx-client/src/index.ts). Positive and negative contract tests are maintained in [`contracts-v1.test.ts`](../../../../code/packages/test-fixtures/src/ctx/contracts-v1.test.ts).

Exact CTX ticket, context, and HPKE outputs are published in [Cryptographic and Canonicalization Vectors V1](../fixtures/cryptographic-vectors-v1.md).

## Standards references

- [RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519)
- [RFC 7638: JSON Web Key Thumbprint](https://www.rfc-editor.org/rfc/rfc7638)
- [RFC 8037: Ed25519 and X25519 in JOSE](https://www.rfc-editor.org/rfc/rfc8037)
- [RFC 8414: OAuth 2.0 Authorization Server Metadata](https://www.rfc-editor.org/rfc/rfc8414)
- [RFC 8725: JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725)
- [RFC 9180: Hybrid Public Key Encryption](https://www.rfc-editor.org/rfc/rfc9180)
- [RFC 9449: OAuth 2.0 Demonstrating Proof of Possession](https://www.rfc-editor.org/rfc/rfc9449)

## Related documents

- [CTX Embedded Policy V1](policy-v1.md)
- [Capsule Manifest V1](../capsule/manifest-v1.md)
- [Capsule Cryptographic Suite V1](../capsule/cryptographic-suite-v1.md)
- [CTX authorization and key release design intent](../../05_ctx/authorization-and-key-release.md)
- [V1 threat model](../../07_security-and-privacy/threat-model-v1.md)
