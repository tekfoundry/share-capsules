# V1 Requirements

Status: Current implemented behavior
Last updated: 2026-08-26

## Purpose

This document states current Share Capsules requirements as workflows,
constraints, non-goals, and acceptance criteria. It preserves the meaning of
the legacy design docs while aligning them with the implementation now present
in the repository.

## User Stories

- As a creator, I can protect one supported static image in a signed Capsule so
  I can publish it through ordinary static hosting without exposing plaintext
  to the Host.
- As a creator, I can choose optional time, global-limit, per-account-limit,
  and automation-risk gates without managing provider URLs or cryptographic
  parameters.
- As a creator, I can manage Capsule inventory, see privacy-safe metrics, pause
  or resume releases, revoke a Capsule revision, or delete a Capsule record and
  destroy broker-held key material.
- As a viewer, I can inspect access requirements, connect my account, register
  a Viewer device, approve disclosure, and open authorized content inside the
  trusted Viewer.
- As a viewer, I can decline disclosure, revoke site/auto-open consent, revoke
  devices, close or restore my account during the recovery period, export
  account privacy data, request correction, appeal, or delete challenge
  evidence.
- As a Host operator, I can serve encrypted Capsule files and public fallback
  markup without receiving credentials, tickets, trust evidence, content keys,
  or plaintext.
- As a compatible implementer or reviewer, I can inspect open contracts,
  fixtures, vectors, threat boundaries, and operational evidence without
  assuming Share Capsules owns the protocol.

## End-To-End Workflow Requirements

1. The creator account must be verified before protected creation or viewing
   behavior proceeds.
2. The extension must use OAuth Authorization Code with PKCE for account
   connection and must not receive the account password.
3. Device registration must prove possession of distinct Ed25519 proof and
   X25519 agreement public keys.
4. Creator tooling must validate supported input before packaging and must keep
   creator signing keys, recovery code, plaintext, and content keys out of
   Laravel ordinary application paths.
5. The control plane must receive only the content-key digest and safe Capsule
   metadata when issuing broker-registration grants.
6. The broker must receive the raw content key directly from trusted tooling,
   protect it through the key-custody boundary, and return an opaque release
   handle.
7. Capsule finalization must occur only after local strict package verification
   and broker activation.
8. The Viewer must reject unsupported formats, profiles, suites, package
   entries, URL shapes, providers, brokers, policies, signatures, commitments,
   or resource envelopes before disclosure or key release.
9. CTX authorization must be device-bound, policy-bound, action-bound,
   audience-bound, and short lived.
10. Broker release must validate ticket and device proof, perform online
    redemption, commit counters atomically, and return the wrapped content key
    only after a committed release.
11. Rendering must occur in the extension-controlled Viewer boundary, with
    plaintext and unwrapped keys retained only for the active session.
12. Failure states must be actionable to the viewer and privacy-safe to Hosts
    and creators.

## Supported Content And Host Constraints

V1 supports one static image payload per Capsule revision:

- `image/jpeg`
- `image/png`
- `image/webp`

SVG, GIF, APNG, animated WebP, active content, and unsupported forms fail
closed. The image profile enforces the current envelope:

- maximum encoded plaintext image size: 25 MiB;
- maximum width: 16,384 pixels;
- maximum height: 16,384 pixels;
- maximum decoded pixel count: 40,000,000;
- maximum nominal RGBA decoded size: 160,000,000 bytes.

The Host contract requires explicit `<capsule-viewer>` markup and HTTPS
Capsule URLs in production. Public fallback content remains Host-owned,
public, unsigned, and untrusted. The Host may serve bytes, place the frame, and
style surrounding layout; it must not participate in identity, policy
evaluation, key release, or plaintext rendering.

## Policy Requirements

Every V1 policy is a structured embedded JSON policy covered by the creator
signature. V1 supports one `all` combiner with mandatory account, device, and
consent predicates plus optional:

- opening instant;
- closing instant;
- Capsule-global lifetime limit;
- account-and-Capsule lifetime limit;
- current ecosystem automation-risk-not-high predicate.

Unknown fields, unknown versions, unknown predicates, unsupported profiles, and
unsupported suites fail closed. Provider-side state may deny access or enforce
operational controls, but it must not loosen the signed policy.

## Account And Lifecycle Requirements

The account system must support registration, email verification, login,
logout, password reset, optional passkeys, session inspection, session
revocation, device inspection, device naming, device suspension/reactivation,
device revocation, account closure, restoration within 30 days, permanent
deletion, deletion-ledger replay, and active-sanction tombstones.

Account closure immediately prevents creation and viewing. Restoration during
the recovery period must restore access only after broker resume succeeds.
Permanent deletion removes personal account data and detailed trust profile,
destroys broker-held creator content keys, and does not transfer standing or
Capsules to a replacement account.

## Non-Goals

V1 does not provide:

- perfect copy prevention after authorized rendering;
- guaranteed proof of humanity or benign future intent;
- one-human-one-account enforcement;
- a universal trust score, token, or marketplace;
- general browser surveillance or unrelated browsing telemetry;
- mandatory legal identity or biometrics;
- general-purpose creator hosting;
- server-side or Host-page JavaScript decryption fallback;
- mobile, cross-browser, offline, or lower-assurance web viewing;
- arbitrary provider/broker URL acceptance in official tools;
- chunked payloads, adaptive renditions, or additional content profiles.

## Acceptance Criteria

- Current public and developer docs route readers to `_docs/kb`, except where
  explicitly discussing the preserved migration baseline.
- The KB documents include product, requirements, architecture, security,
  quality, operations, decisions, and glossary coverage.
- Every legacy design file is accounted for in
  [Legacy design migration inventory](../migration-inventory.md).
- Public technical source links point to KB documents.
- Automated documentation link checks pass for the migrated docs.
- Reasonable project verification runs without changing product behavior, or
  any skipped/failed verification is recorded with residual risk.

## Open Requirements Gaps

- Production calibration and false-positive review for automation-risk
  thresholds remain part of the deployment value gate.
- Independent interoperability has not yet been demonstrated, so the protocols
  remain experimental.
- Third-party provider/broker recognition criteria remain deferred.

## Migration Coverage

Detailed legacy-to-KB provenance is tracked in the
[migration inventory](../migration-inventory.md). Requirements-specific durable
facts now live in this area and the linked detailed pages in its README.
