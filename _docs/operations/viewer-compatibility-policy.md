# Viewer Compatibility Policy

Status: Phase 10 baseline
Last updated: 2026-06-26

## V1 Supported Viewer

V1 supports the packaged Share Capsules Chromium extension only.

- Viewer name: `share-capsules-chromium-extension`
- Current Viewer version: `0.1.0`
- Minimum Viewer version accepted by CTX authorization: `0.1.0`
- Supported browser families: Chrome and Chromium
- Minimum Chrome/Chromium major version: 149

The minimum browser version is based on the current static-image envelope benchmark artifacts recorded in this directory. The V1 image profile must be reduced or re-benchmarked before lowering this browser floor.

## Provider Enforcement

Every CTX authorization request includes a `viewer` object with the declared Viewer name, Viewer version, browser family, and browser major version. The provider rejects requests that are below the configured minimums, identify an unsupported browser family, use the wrong Viewer name, or match a suspended Viewer release.

Unsupported or suspended Viewers receive the existing `unsupported_contract` CTX error. Creator-facing metrics keep this as a safe `policy` denial category rather than exposing exact Viewer version or suspension details.

## Configuration

The default policy is defined in `config/sharecapsules.php`.

- `SHARECAPSULES_VIEWER_MINIMUM_VERSION`
- `SHARECAPSULES_VIEWER_MINIMUM_CHROMIUM_MAJOR`
- `SHARECAPSULES_VIEWER_SUSPENDED_VERSIONS`

`SHARECAPSULES_VIEWER_SUSPENDED_VERSIONS` is a comma-separated exact-version list. Use it for an emergency release suspension when a published Viewer build is known vulnerable or incompatible.

## Evidence

- `ViewerCompatibilityPolicyTest.php` covers supported browsers, minimum versions, and suspended releases.
- `DpopTokenTest.php` verifies a suspended Viewer release is rejected before ticket issuance.
- `viewer-ctx-authorization.test.ts` verifies the extension sends the Viewer release declaration.
- `manifest-v3.test.ts` verifies the packaged manifest version matches the declared Viewer release.
