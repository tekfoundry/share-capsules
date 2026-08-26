# Verification Strategy

Status: Current implemented behavior
Last updated: 2026-08-26

## Purpose

This document records the current verification model for Share Capsules,
including automated tests, release checks, manual validation, and known gaps.

## Normal Verification Commands

From the repository root, run commands through the pinned container wrapper:

```bash
./_infra/kit check
```

Targeted commands used by implementation evidence include:

```bash
./_infra/kit test
./_infra/kit npm test:ts
./_infra/kit npm typecheck
./_infra/kit npm lint
./_infra/kit npm build
./_infra/kit npm test:browser
```

Use narrower tests first when checking a focused change, then broader gates
when the changed surface warrants it.

## Test Levels

| Level | Coverage |
| --- | --- |
| TypeScript unit/contract | Capsule contracts, schema validators, manifest/signature/policy/encryption, fixture catalog, CTX contracts, extension modules, Viewer states, storage policy, DPoP, HPKE, creator workflow |
| PHP unit | canonical/vector consumption, CTX policy/tickets, metrics, risk, challenge orchestration, broker services, account sessions, deployment config, registry lifecycle |
| PHP feature | public pages, account/auth flows, OAuth/DPoP, device registration, CTX discovery/authorization, broker isolation, content-key registration/release, account deletion/retention, Capsule inventory, challenge playgrounds |
| Browser tests | public-page content, metadata, responsive behavior, accessibility smoke checks, link behavior, and implementation-status claims |
| Operational checks | extension packaging, supply-chain release scan, static-image benchmark, broker health, production identity, deployment ledger, security review evidence |

## Contract Verification

Contract tests must prove RFC 8785 canonical JSON agreement, exact suite
identifier and primitive mapping, manifest schema and semantic validation,
Ed25519 manifest and CTX ticket signatures, payload encryption AAD/ciphertext
and authentication failure, SHA-256 entry commitments, static-image envelope
behavior, CTX policy digest, CTX metadata/tickets/proofs/HPKE contexts, and
privacy-safe error shapes.

## Security-Sensitive Verification

Security checks must cover exact OAuth redirects, PKCE, DPoP proof, token scope,
refresh rotation, device registration and revocation, broker route isolation,
service-origin handling, custody configuration refusal, ticket validation,
online redemption concurrency, lost-response counting behavior, retention
pruning, deletion-ledger replay, extension permissions, and the absence of
protected secrets in ordinary logs, URLs, metrics, Host DOM, and extension
storage.

## Manual Validation

Manual review is still expected for representative desktop/mobile public-page
clarity, creator extension workspace and recovery-code UX, extension
installation and resume behavior, trusted Viewer frame copy and focus, static
Host/showcase publication, and production deployment readiness.

## Release Gates

Before operational V1 release, evidence should include full app/container
health checks, migration and rollback readiness, broker deployment and
isolation smoke checks, ticket-signing key lifecycle exercise, extension
package build, permission review, signed distribution identity, supply-chain
scan, static-image benchmark, independent security-review evidence, and
production change-ledger entries.

## Known Validation Gaps

- Protocols remain experimental until independent interoperability is
  demonstrated beyond the reference implementation and shared vectors.
- Production automation-risk threshold calibration and false-positive review
  remain a deployment value-gate item.
- Fuzzing/corpus depth for package parsing and image decoders should continue
  to grow before broad public reliance.
- Cross-browser and mobile assurance are intentionally not part of V1.

## Source Design Baseline

This page migrates release-security gates from the legacy threat model,
specification executable-contract sections, fixture/vector docs, and operations
evidence under `_docs/operations/`.
