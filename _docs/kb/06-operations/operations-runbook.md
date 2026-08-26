# Operations Runbook

Status: Current implemented behavior
Last updated: 2026-08-26

## Purpose

This page summarizes current build, runtime, release, rollback, and incident
operations. Detailed evidence remains in `_docs/operations/`.

## Local Development

Required host tools are Docker Desktop with Docker Compose and Git. The pinned
application container owns Composer, npm, Artisan, build, and test execution.

```bash
./_infra/kit doctor
./_infra/kit up
./_infra/kit artisan migrate
./_infra/kit check
```

Default local endpoints:

- Laravel control plane: `http://localhost:3003`
- Vite: `http://localhost:5174`
- Mailpit: `http://localhost:8026`
- Broker runtime: configured separately by `_infra`/environment for the
  isolated broker component

## Runtime Topology

The project uses one locked code artifact that can boot as `control-plane`, the
default Laravel account/CTX runtime, or `broker`, the isolated key-broker
runtime selected by `SHARECAPSULES_COMPONENT=broker`.

Control-plane and broker deployments use distinct origins, credentials, storage
access, health checks, route surfaces, and audit paths. Development may run
same-install host-based routing for convenience, but the broker boundary
remains explicit in configuration and tests.

## Scheduled Jobs

Current scheduler responsibilities include pruning challenge/device/proof,
ticket, metric, risk, sanction, and deletion-ledger records; deleting expired
closed accounts; cleaning expired pending Capsule registrations; generating
showcase Capsules when enabled; and retiring expired CTX ticket-signing keys.

## Production Change Control

Production configuration and operational changes are tracked in
[`_docs/operations/production-change-ledger.md`](../../operations/production-change-ledger.md).
The ledger records environment variable names, migrations, infrastructure or
identity changes, deployment actions, verification, and rollback
considerations. It must not contain secret values.

Environment templates remain the authoritative inventory of variable names and
safe examples.

## Release And Packaging

Extension release operations are governed by:

- [`chrome-web-store-production-identity.md`](../../operations/chrome-web-store-production-identity.md)
- [`viewer-compatibility-policy.md`](../../operations/viewer-compatibility-policy.md)
- [`supply-chain-release-check.md`](../../operations/supply-chain-release-check.md)
- `code/scripts/release-extension-production.mjs`
- `code/scripts/release-supply-chain-check.mjs`

The extension release process checks production identity, package contents,
manifest permissions, no remote executable code, locked dependencies, and
minimum/suspended Viewer version policy.

## Broker Operations

Broker deployment and key operations are documented in:

- [`broker-deployment.md`](../../operations/broker-deployment.md)
- [`ctx-ticket-signing-key-rotation.md`](../../operations/ctx-ticket-signing-key-rotation.md)
- [`viewer-key-release-integration-test.md`](../../operations/viewer-key-release-integration-test.md)

The broker must fail closed when custody configuration is invalid, when local
custody is configured for production without explicit allowance, when
control-plane credentials are missing or invalid, or when CTX public-key
resolution is unavailable.

## Incident And Suspension Behavior

Security-relevant incidents may require emergency ticket-signing key revocation,
minimum Viewer version increases, suspended extension versions, broker
content-key pause/revocation/destruction, release suspension for compromised
extension/dependency artifacts, deletion-ledger replay before restored systems
serve traffic, and updated production ledger entries.

## Detailed Operations Evidence

- [`independent-security-review.md`](../../operations/independent-security-review.md)
- [`phase10-security-privacy-evidence.md`](../../operations/phase10-security-privacy-evidence.md)
- [`phase12-production-runbook.md`](../../operations/phase12-production-runbook.md)
- [`phase7-creator-runtime-manual-test.md`](../../operations/phase7-creator-runtime-manual-test.md)
- [`public-repository-security-controls.md`](../../operations/public-repository-security-controls.md)
- [`static-image-envelope-benchmark.md`](../../operations/static-image-envelope-benchmark.md)
- [`trust-capsule-challenge-operations.md`](../../operations/trust-capsule-challenge-operations.md)

## Migration Coverage

Detailed legacy-to-KB provenance is tracked in the
[migration inventory](../migration-inventory.md). Operational facts now live in
this page, with detailed runbooks retained under `_docs/operations/`.
