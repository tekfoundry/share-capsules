# Supply-Chain Release Check

Status: Phase 10 baseline
Last updated: 2026-06-26

## Purpose

Record repeatable commands for dependency review, static analysis, extension permission review, remotely hosted code checks, tracked-source secret scanning, and reproducible extension build hashing before a public release.

## Commands

Run from the repository root:

```sh
./_infra/kit npm audit --audit-level=moderate
./_infra/kit composer audit
./_infra/kit npm run lint
./_infra/kit composer lint
./_infra/kit npm run typecheck
./_infra/kit npm run build:extension
./_infra/kit npm run release:supply-chain-check
```

The final command builds the unpacked extension twice, compares every built file hash, scans the built extension for remote executable-code references, scans tracked source for high-confidence secret patterns, and writes sanitized JSON evidence.

## Current Evidence

Artifact: [supply-chain-release-check-latest.json](supply-chain-release-check-latest.json)

Current result:

- Status: passed
- Built extension files: 15
- Extension aggregate SHA-256: `b80e70ba33c66def4ded9c21694040254194facaa417b67abecc8110461319d5`
- Reproducible extension build: passed
- Built extension remote-code scan: passed
- Tracked-source secret scan: passed
- Findings: none

Current audit and static-analysis command results:

- `./_infra/kit npm audit --audit-level=moderate`: found 0 vulnerabilities
- `./_infra/kit composer audit`: no security vulnerability advisories found
- `./_infra/kit npm run lint`: passed
- `./_infra/kit composer lint`: passed
- `./_infra/kit npm run typecheck`: passed
- `./_infra/kit npm run build:extension`: passed

## Owners

- Dependency audit: Engineering and Security
- Static analysis and formatting gates: Engineering
- Extension permissions and no-remotely-hosted-code review: Engineering and Security
- Release hashes and reproducibility evidence: Engineering and Operations

## Release Notes

Publish the aggregate hash and file-hash artifact with the release candidate. If the Chrome Web Store package is produced from a different build environment, rerun this check there and compare the generated artifact before submission.
