# Identity and Device Verification

Status: Draft
Last updated: 2026-06-18

## Purpose

Define the privacy and trust boundaries for optional device binding, photographs, identity documents, biometrics, and personhood evidence.

## Opt-in requirement

Device and identity verification beyond basic account authentication is opt-in. Creators may require resulting assurance predicates for particular Capsules, so declining may limit access.

Consent must identify the evidence collected, the provider processing it, retention, resulting assertion, and who may receive that assertion.

## Device binding

Each trusted Viewer has a registered device key. An account holder may additionally allow device-continuity and environmental signals to contribute to risk assessment.

Prefer the term device binding over hardware fingerprinting. A hardware or browser fingerprint is probabilistic, may change after updates, and may enable unwanted correlation.

Possible evidence includes:

- Registered device-key continuity
- Platform or hardware-backed key assertions
- Browser and operating-system consistency
- Device-attestation results where supported
- Suspicious device changes or impossible concurrency

A device fingerprint must not become the account's identity or the sole basis for denial.

## Photo and identity document

Optional identity proofing may produce separate assertions:

- Liveness check completed
- Photo matched to identity document
- Identity evidence validated
- Unique or duplicate enrollment checked

These assertions must not be collapsed into one ambiguous `verified` status.

A specialist provider should collect and process source evidence. The Share Capsules CTX service should receive a signed credential or limited result. Creators and Hosts receive only the aggregate predicate needed by policy and approved by the account holder.

Raw photographs, document images, document numbers, legal names, and biometric templates must not be included in Capsules or disclosed to creators through ordinary CTX evaluation.

## Retention and revocation

Every provider must disclose:

- What source evidence it retains
- Retention duration and purpose
- Whether evidence is used for duplicate-enrollment checks
- Deletion and correction procedures
- Credential validity and expiration
- Revocation and appeal behavior

Disabling future verification does not necessarily erase an already issued credential immediately, but the credential must have explicit freshness and lifecycle rules.

## Policy disclosure

Creators should normally receive a predicate such as:

```text
accepted_identity_provider_requirement: satisfied
```

They should not receive the underlying ID, photograph, exact device fingerprint, or unrelated assurance details.

## Open questions

- Which providers meet CTX privacy and assurance requirements?
- Does duplicate-enrollment prevention require a stable provider-side biometric template?
- Can a user prove unique enrollment pseudonymously across CTX providers?
- How do false matches and provider errors affect account access?

## Related documents

- [Accounts and identity](../03_architecture/accounts-and-identity.md)
- [Human confidence](../05_ctx/human-confidence.md)
- [Privacy model](privacy-model.md)
