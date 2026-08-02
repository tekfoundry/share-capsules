# Supply-Chain Release Check

Status: Phase 10 baseline
Last updated: 2026-06-26

## Purpose

Record repeatable commands for dependency review, static analysis, extension permission review, remotely hosted code checks, tracked-source secret scanning, and reproducible extension build hashing before a public release.

## Commands

Run from the repository root:

```sh
./_infra/kit npm run release:extension:production
```

The extension release script runs the release gates, builds the production extension with the recorded public production identity, verifies the production manifest, writes the production supply-chain evidence, creates the Chrome Web Store upload ZIP, and writes `extension-release-candidate-latest.json`.

For lower-level troubleshooting, these are the individual gates the release script runs:

```sh
./_infra/kit npm audit --audit-level=moderate
./_infra/kit composer audit
./_infra/kit npm run test:ts
./_infra/kit npm run lint
./_infra/kit composer lint
./_infra/kit npm run typecheck
./_infra/kit npm run format:check
```

The supply-chain portion builds the unpacked extension twice, compares every built file hash, scans the built extension for remote executable-code references, scans tracked source for high-confidence secret patterns, and writes sanitized JSON evidence.

## Current Evidence

Artifact: [supply-chain-release-check-latest.json](supply-chain-release-check-latest.json)

Current result:

- Status: passed
- Built extension files: 15
- Extension aggregate SHA-256: `b8a8ef92dea389e9f21f15bc74f7c0416611300255520a508ac92d6f712dd756`
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
- `./_infra/kit npm run build:extension:production -- --sharecapsules-extension-id=jkejpdcobbbeichpodpeoiilnalepdph --sharecapsules-extension-public-key=<recorded-production-public-key> --sharecapsules-oauth-extension-client-id=418997f0-d3bd-4f91-811b-3352a006220f`: passed

## Owners

- Dependency audit: Engineering and Security
- Static analysis and formatting gates: Engineering
- Extension permissions and no-remotely-hosted-code review: Engineering and Security
- Release hashes and reproducibility evidence: Engineering and Operations

## Release Notes

Publish the aggregate hash and file-hash artifact with the release candidate. If the Chrome Web Store package is produced from a different build environment, rerun this check there and compare the generated artifact before submission.
