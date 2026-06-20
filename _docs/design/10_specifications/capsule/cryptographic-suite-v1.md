# Capsule Cryptographic Suite V1

Status: Experimental normative contract
Last updated: 2026-06-20

## Scope

This specification defines the exact cryptographic primitive set selected by Capsule suite `ctx-capsule-v1` and its downgrade boundary. Operation-specific byte construction, canonicalization, authenticated context, detached-signature representation, and deterministic vectors are defined by their respective V1 operation specifications, beginning with [Capsule Manifest Signature V1](manifest-signature-v1.md).

The machine-readable implementation contract is [`cryptographic-suite.ts`](../../../../code/packages/capsule-core/src/cryptographic-suite.ts).

## Suite identifier

The V1 suite identifier is the exact, case-sensitive ASCII string:

```text
ctx-capsule-v1
```

The identifier selects the complete primitive and parameter set in this document. It is not a preference, family, minimum version, or invitation to negotiate individual algorithms.

A V1 implementation:

- MUST accept only the exact `ctx-capsule-v1` identifier when processing a format `1.0` Capsule.
- MUST reject a missing, empty, malformed, differently cased, unknown, older, or newer suite identifier.
- MUST NOT trim, normalize, alias, rank, negotiate, or silently substitute a suite identifier.
- MUST NOT accept per-message algorithm overrides that differ from the selected suite.
- MUST fail before policy disclosure, authenticated CTX traffic, key release, payload decryption, or rendering when the suite is unsupported or unavailable.

A future suite receives a new exact identifier and explicit compatibility contract. A future implementation may deliberately support more than one suite, but it must resolve the signed identifier directly; it must not downgrade a Capsule to another supported suite.

## Selected primitive set

| Purpose | Exact identifier | Parameters |
|---|---|---|
| Creator manifest signature | `Ed25519` | 32-byte public key; 64-byte signature |
| Entry and identifier digest | `SHA-256` | 32-byte digest |
| Protected-payload encryption | `AES-256-GCM` | 32-byte key; 12-byte nonce; 16-byte tag |
| Content-key delivery protocol | `HPKE` | RFC 9180 base mode |
| HPKE mode | `base` | Mode code `0x00` |
| HPKE KEM | `DHKEM(X25519, HKDF-SHA256)` | KEM ID `0x0020` |
| HPKE KDF | `HKDF-SHA256` | KDF ID `0x0001` |
| HPKE AEAD | `AES-256-GCM` | AEAD ID `0x0002` |

The manifest's `creator.signing_key.algorithm` field MUST equal `Ed25519`. Its presence is an explicit consistency check; it does not permit a creator to choose a different signature primitive within this suite.

The payload encryption object identifies the V1 whole-payload representation and nonce but carries no algorithm-selection field. `ctx-capsule-v1` already selects AES-256-GCM. An added payload-level algorithm field is an unknown field and MUST be rejected.

## Key separation

Selecting the same primitive for more than one purpose does not permit key reuse. Creator manifest signatures, Viewer device proof, CTX ticket signatures, payload encryption, Viewer key agreement, broker wrapping, and recovery use distinct key material and purpose-specific contexts.

The suite identifier does not override the key-role and domain-separation requirements in the operation specifications.

## Runtime capability

An implementation MUST verify that every primitive needed for the attempted operation is available through its accepted cryptographic provider. Recognizing the suite identifier without being able to execute the required operation is not suite support.

Capability failure MUST produce a closed failure. An implementation MUST NOT replace an unavailable primitive with a weaker or merely similar primitive.

## Executable contract

Automated tests MUST lock down:

- The exact suite identifier and primitive mapping
- Every fixed key, nonce, tag, digest, signature, and HPKE identifier parameter in this document
- Rejection of missing, malformed, older, future, differently cased, and structured suite values
- Rejection of mismatched signature algorithms
- Rejection of payload-level downgrade overrides
- Runtime immutability of the exported suite definition

The Share Capsules reference tests are in [`cryptographic-suite-v1.test.ts`](../../../../code/packages/test-fixtures/src/capsule/cryptographic-suite-v1.test.ts).

## Related specifications

- [Capsule Manifest V1](manifest-v1.md)
- [Capsule Manifest Signature V1](manifest-signature-v1.md)
- [Capsule Payload Encryption V1](payload-encryption-v1.md)
- [V1 cryptographic design intent](../../07_security-and-privacy/cryptographic-suite-v1.md)

## Standards references

- [FIPS 180-4: Secure Hash Standard](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)
- [NIST SP 800-38D: Galois/Counter Mode](https://csrc.nist.gov/pubs/sp/800/38/d/final)
- [RFC 8032: Edwards-Curve Digital Signature Algorithm](https://www.rfc-editor.org/rfc/rfc8032)
- [RFC 9180: Hybrid Public Key Encryption](https://www.rfc-editor.org/rfc/rfc9180)
