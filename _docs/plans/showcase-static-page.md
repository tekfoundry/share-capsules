# Showcase Static Page

Status: Draft
Last updated: 2026-08-01

## Context

Share Capsules has a working production system, a published Chrome Web Store extension, and an existing static-host policy fixture page at `_examples/static-host/test.html`. Before inviting a small cohort of users, the project needs a public showcase that lets visitors try representative Capsule policy examples.

The showcase should also become repeatable test infrastructure. Instead of manually creating example Capsules, the project should be able to regenerate them from known source images and policy configuration through an internal, operator-run command.

The resulting page should remain a static public Host page served from the Laravel public directory, likely `code/public/showcase.html`. It should not be a Blade view, authenticated Laravel route, scheduled worker, or user-specific application feature.

This does not replace the Phase 12 separate static reference Host validation. A page served from `sharecapsules.com` can help onboarding and demo readiness, but it does not prove separate-origin CORS/cache/header behavior.

## Objective

Create secure, repeatable showcase infrastructure that generates production-compatible `.capsule` examples from public demo source images, publishes them under `code/public/showcase/capsules/`, and presents them on a static `https://sharecapsules.com/showcase.html` page beside their intentionally public source images.

The implementation should first strengthen the Creator build test suite, then extract reusable TypeScript Creator generation code into a shared package so both the browser extension and showcase generator use the same Capsule construction path.

## Design Intent

- Showcase generation is a manual internal operator action, not a nightly scheduler.
- Capsule construction should remain a TypeScript responsibility built on `@sharecapsules/capsule-core`; do not reimplement Capsule encryption, manifest signing, ZIP assembly, or archive verification in PHP.
- Shared Creator generation code should live in a reusable TypeScript package and be consumed by both the browser extension and showcase generator.
- The showcase generator may invoke Node from Laravel, but the Node bridge should be narrow and should not become a second control plane.
- The Node bridge should build and verify Capsule archive material through the shared package; Laravel should continue to own operator configuration, system-owned creator lookup, broker/registry lifecycle, cleanup, and final public file placement.
- Public API routes, broker routes, Capsule format, and published Viewer behavior must not change just to support showcase automation.
- Showcase generation must not store or use a normal username/password, browser session, OAuth refresh token, or extension private key.
- The automation uses a system-owned showcase creator identity. This identity should be represented by a normal `users` row for ownership and lifecycle compatibility, but should not be treated as an interactive human account.
- The configured showcase owner should be loaded by internal command context, for example through `SHOWCASE_CREATOR_USER_ID` or `SHOWCASE_CREATOR_EMAIL`, rather than by logging in.
- The automation should preserve core domain invariants: pending Capsule registration, broker content-key registration, broker finalization, local archive verification, registry ownership, and cleanup behavior.
- The automation should not insert broker key records by hand or bypass lifecycle services.
- The showcase should use its own automation-owned signing identity. It must not reuse a human creator's extension signing key, recovery bundle, browser storage, or private key.
- Source images are intentionally public demo material. Real creators should not be encouraged to publish unprotected originals beside protected Capsules unless they intentionally want that comparison.
- Generated `.capsule` filenames should be revision-friendly, such as `open-image-r1.capsule`, so regenerated artifacts do not silently mutate cached bytes.

Because there are no real users yet, it is acceptable for this work to produce a no-behavior-change extension refactor and a new Chrome Web Store package if the production extension bundle changes. The release evidence should make that explicit rather than hiding the bundle change.

## Recommended Examples

Reviewed on 2026-08-01:

- `_examples/static-host/test.html`
- `_examples/static-host/index.html`
- `_examples/static-host/README.md`
- `code/resources/views/public/capsule-test.blade.php`
- `code/routes/web.php`

The existing static-host fixture set covers the right policy concepts for a showcase, but the checked-in fixture Capsules are documented as local development artifacts whose manifests reference local development services. Do not copy those exact `.capsule` files into the production showcase unless they are regenerated or replaced with production-created equivalents.

The selected showcase source images were sourced from "Free Stock Photos" and are licensed as free to use with no attribution required.

Recommended first showcase set:

- Open static-image Capsule: opens normally and proves the basic source-image-to-Capsule path.
- Time Capsule, opens later: not-before example that demonstrates a locked future state.
- Time Capsule, already open: not-before-in-the-past or current-window example.
- Time Capsule, expired: not-after-in-the-past example.
- Limit Capsule: one per-account or global limit example, preferably with generous limits so invited users do not exhaust it immediately.
- Revoked Capsule: optional first-pass negative example after a generated disposable Capsule is permanently revoked and verified.

Defer from the first user-facing showcase:

- Trust Capsule, unless the expected challenge-required or trust-gated behavior is stable enough for invited users.
- Combined Capsule, until simpler examples are production-generated and verified.
- Bulk-page safety examples, which should stay in `_examples/static-host/test.html` as test fixtures rather than onboarding content.

Recommended first implementation should be small: open image, future-locked time, already-open time, expired time, one limit example, and optionally one revoked negative example.

## Public Asset Layout

```text
code/public/showcase.html
code/public/showcase/
  images/
    open-image.jpg
    time-future.jpg
    time-open.jpg
    time-expired.jpg
    limit.jpg
    revoked.jpg
  capsules/
    open-image-r1.capsule
    time-future-r1.capsule
    time-open-r1.capsule
    time-expired-r1.capsule
    limit-r1.capsule
    revoked-r1.capsule
```

## Tasks

### 1. Plan And Assets

- ✅️ Review `_examples/static-host/test.html` and identify which existing policy examples are appropriate for an invited-user showcase.
- ✅️ Create `code/public/showcase/images/` and `code/public/showcase/capsules/` placeholders.
- ✅️ Select a distinct demo-safe source image for each showcased policy example.
- ✅️ Confirm each source image is original, project-owned, permissively licensed, or otherwise safe to publish publicly.
- ✅️ Normalize source image naming under `code/public/showcase/images/` without revision suffixes.

### 2. Secure Automation Design

- ✅️ Define the system-owned showcase creator account policy: ownership, email/name convention, verification state, no interactive login secret, and operational recovery expectations.
- ✅️ Add showcase configuration for the owner lookup, public asset paths, example definitions, and generation behavior without storing secret values in source.
- ✅️ Define the showcase signing identity policy: how the private signing key is generated, stored, rotated, and separated from human extension signing keys.
- ✅️ Decide whether first implementation stores an encrypted showcase signing key in application secret storage or generates a fresh signing key per regeneration.
- ✅️ Document why the command loads the owner from internal operator context rather than authenticating with OAuth, browser state, or a password.

Section 2 design decision:

- Showcase generation is disabled by default through `SHOWCASE_GENERATION_ENABLED=false`.
- The system-owned showcase creator is selected by `SHOWCASE_CREATOR_EMAIL` and `SHOWCASE_CREATOR_NAME`, defaulting to `info@tekfoundry.com` / `Share Capsules Showcase`.
- The showcase owner is expected to be verified and non-interactive. It must not have a reusable login secret used by automation.
- The future operator command will load the owner from Laravel's internal command context. It will not authenticate through OAuth, DPoP, browser session state, password login, or extension storage because those mechanisms model external Viewer/Creator clients rather than trusted operator maintenance.
- The first implementation uses `SHOWCASE_SIGNING_STRATEGY=fresh-per-generation`. Each generation creates automation-owned signing material for the generated Capsules and does not persist a showcase signing private key.
- Persistent showcase signing secrets are intentionally unsupported for now. If stable signing identity becomes necessary, add an explicit encrypted secret-storage design and rotation plan before enabling it.
- Public asset paths are fixed under `showcase/images` and `showcase/capsules`.
- Generated Capsules do not overwrite existing Capsule bytes unless a later command adds an explicit force or revision option.
- The automation still must preserve registry and broker lifecycle behavior; the secure design only avoids client-login credentials, not lifecycle checks.

### 3. Build And Enhance Creator Test Suite

- ✅️ Inventory existing Creator build tests and identify coverage gaps before moving any extension code.
- ✅️ Add or strengthen tests around CTX policy construction for open, time-window, limit, trust, and combined policies.
- ✅️ Add or strengthen tests around static-image metadata extraction from source bytes.
- ✅️ Add or strengthen tests around payload encryption context, content key handling, nonce handling, manifest payload declarations, and policy digest binding.
- ✅️ Add or strengthen tests around broker registration inputs and lifecycle ordering without changing API or broker behavior.
- ✅️ Define deterministic Creator fixture inputs for before/after comparison: source image bytes, draft/policy values, deterministic test-only signing material, random UUID sequence, deterministic test-only content key/nonce material, fake broker registration result, fixed clock, and expected metadata.
- ✅️ Add a baseline-generation script or test helper that can produce sanitized Creator baseline artifacts from those deterministic inputs.
- ✅️ Commit sanitized baseline artifacts under a dedicated path, for example `code/tests/fixtures/creator-build-baseline/`.
- ✅️ Include enough baseline data to prove equivalence without recording secrets: policy JSON, policy digest, manifest JSON, canonical manifest SHA-256, encrypted payload SHA-256, archive SHA-256, archive entry names/sizes, broker registration input shape, finalization call shape, and expected failure cleanup calls.
- ✅️ Generate deterministic fixture signing keys, content keys, and nonces only from clearly labeled test-only seeds/helpers; never use production, operator, human creator, extension, OAuth, DPoP, recovery, or browser session secrets in baseline artifacts.
- ✅️ Do not commit production plaintext content keys, production private signing keys, OAuth tokens, DPoP private keys, recovery material, or browser session data in baseline artifacts.
- ✅️ Add before-extraction golden behavior tests that compare current Creator output to the committed baseline artifacts.
- ✅️ Require baseline regeneration to be explicit, for example through a dedicated script or env flag, so normal test runs only compare against committed baselines.
- ✅️ Add tests proving failure paths cancel broker registration or leave cleanup-retryable state.
- ✅️ Run the enhanced Creator test suite against committed baselines and record the exact command/output before refactoring.

Section 3 baseline evidence recorded on 2026-08-01:

- Existing Creator coverage inventory found focused tests for `creator-capsule-builder`, `creator-capsule-workflow`, `creator-broker-registration`, `creator-payload-secrets`, and `static-image-creator-profile`.
- Added an explicit CTX policy matrix test for open, time-window, limit, trust, and combined Creator draft policies.
- Added a deterministic golden baseline test to `code/apps/browser-extension/src/creator-capsule-builder.test.ts`.
- Added sanitized baseline artifact `code/tests/fixtures/creator-build-baseline/full-static-image.json`.
- Baseline regeneration is explicit: `UPDATE_CREATOR_BUILD_BASELINE=1 npm run test:ts -- apps/browser-extension/src/creator-capsule-builder.test.ts`.
- Normal test runs compare against the committed baseline and do not rewrite it.
- Before-extraction focused Creator command:
  `PATH=/Users/rcravens/.nvm/versions/node/v24.9.0/bin:$PATH npm run test:ts -- apps/browser-extension/src/creator-capsule-builder.test.ts apps/browser-extension/src/static-image-creator-profile.test.ts apps/browser-extension/src/creator-broker-registration.test.ts apps/browser-extension/src/creator-capsule-workflow.test.ts apps/browser-extension/src/creator-payload-secrets.test.ts`
- Before-extraction focused Creator result: 5 test files passed, 52 tests passed.
- Before-extraction TypeScript result: `npm run typecheck` passed.
- Before-extraction lint result: `npm run lint` passed.

### 4. Extract Shared Creator Package

- ✅️ Create `code/packages/capsule-creator/` as a TypeScript workspace package for reusable Creator-side Capsule generation.
- ✅️ Move reusable policy-building code into the shared package without changing behavior.
- ✅️ Decide whether the shared TypeScript package becomes the authoritative showcase policy builder or whether Laravel keeps declarative policy config; add tests so PHP-side showcase policy definitions cannot drift from the TypeScript Creator behavior.
- ✅️ Move reusable static-image metadata and source-byte handling into the shared package without changing behavior.
- ✅️ Move reusable payload secret generation, payload encryption, manifest construction, manifest signing, archive assembly, and archive verification into the shared package without changing behavior.
- ✅️ Keep browser-extension-specific concerns in the extension package: UI state, OAuth/session storage, Viewer-device key storage, file picker state, download UX, and extension runtime messaging.
- ✅️ Refactor the browser extension Creator workflow to import the shared package.
- ✅️ Run the same committed-baseline tests after extraction and require byte-for-byte or digest-for-digest equivalence for deterministic inputs.
- ✅️ If any baseline artifact changes, stop and classify the diff as either an intentional behavior change requiring review/release notes or an extraction bug requiring correction.
- ✅️ Run extension TypeScript tests, typecheck, extension build, and supply-chain checks after the extraction.
- ✅️ Document whether the production extension bundle hash changes and whether a no-behavior-change Chrome Web Store release is required before broader user invitation.

Section 4 extraction evidence recorded on 2026-08-01:

- Added workspace package `@sharecapsules/capsule-creator` under `code/packages/capsule-creator/`.
- Moved Creator build, CTX policy construction, draft parsing, static-image inspection, content profile contracts, payload secret handling, manifest signing, payload encryption, archive assembly, archive verification, and broker registration contracts into the shared package.
- Left extension-specific concerns in the browser extension: OAuth/DPoP broker client, account/session/device state, file picker/page UI, workspace persistence, runtime messaging, and download UX.
- Browser extension compatibility modules now re-export shared package APIs where appropriate so existing extension call sites remain stable.
- Shared TypeScript package is authoritative for actual Capsule construction. Laravel may keep declarative showcase policy/example configuration, but Section 5's Node bridge should use the shared package for generated Capsule bytes and policy construction. PHP-to-TypeScript drift testing should be added once that bridge exists.
- Post-extraction deterministic Creator baseline comparison passed with no baseline artifact change.
- Post-extraction full TypeScript test result: 46 test files passed, 623 tests passed.
- Post-extraction focused Creator result: 5 test files passed, 52 tests passed.
- Post-extraction TypeScript result: `npm run typecheck` passed.
- Post-extraction lint result: `npm run lint` passed.
- Post-extraction format result: `npm run format:check` passed.
- Post-extraction extension build result: `npm run build:extension` passed.
- Post-extraction supply-chain result: `npm run release:supply-chain-check` passed.
- Production extension package build was run on 2026-08-01 for maintenance release candidate `0.1.1`.
- Production release candidate ZIP: `code/apps/browser-extension/share-capsules-extension-0.1.1-production.zip`.
- Production release candidate ZIP SHA-256: `d9544366a50a571fdd3509561b06fcb9312c03e914f57c442086240ecf883c66`.
- Production-mode supply-chain aggregate SHA changed from `e7c16aa937ba573a27be9fc8c973cd8f0b75a1a7b18c0a8fe7566ac6a955dad3` to `b8a8ef92dea389e9f21f15bc74f7c0416611300255520a508ac92d6f712dd756`. This appears to be a no-behavior-change bundle/module-graph change from the extraction.
- Chrome Web Store review passed and extension version `0.1.1` was released on 2026-08-02. The store-installed extension continued to render the production test page, now canonicalized at `https://sharecapsules.com/capsule-test`.

### 5. Showcase Generation Code

- ✅️ Create `code/app/Showcase/` as the container for showcase generation domain code.
- ✅️ Define typed showcase example configuration, including slug, title, source image path, output Capsule filename, policy type, and expected Viewer behavior.
- ✅️ Add a policy factory for the first showcase examples: open, future-locked time, currently-open time, expired time, limit, and optional revoked.
- ⬜️ Add a narrow Node CLI bridge that invokes the shared `@sharecapsules/capsule-creator` package using JSON input over stdin and sanitized JSON output over stdout.
- ⬜️ Add a Laravel-side builder service that shells out to the Node bridge with strict timeout, exit-code handling, no command-line secrets, and cleanup of temporary files.
- ⬜️ Ensure the bridge can read a source image, create static-image metadata, encrypt payloads, sign manifests, assemble the Capsule archive, and strictly re-open/verify the archive through the shared TypeScript package.
- ⬜️ Add a broker/registry publisher that creates pending registry state, registers the content key through broker services, finalizes registration, and writes the `.capsule` file only after successful verification and finalization.
- ⬜️ Ensure failed, partial, or ambiguous generation cancels or leaves cleanup-retryable state rather than producing a public orphaned Capsule.
- ⬜️ Ensure generated files use stable revision-friendly names and do not overwrite existing Capsule bytes unless an explicit force flag is supplied.

### 6. Operator Command

- ⬜️ Add an Artisan command, for example `php artisan showcase:generate-capsules`.
- ⬜️ Support a dry-run mode that reports planned examples, source files, output files, and owner identity without creating broker records.
- ⬜️ Support generating one named example for focused testing.
- ⬜️ Support an explicit force or revision option for intentional regeneration.
- ⬜️ Emit sanitized generation evidence: example slug, policy type, output filename, capsule id, registration id, release handle presence, and verification result, without logging content keys or private signing material.
- ⬜️ Add tests for successful generation and failure cleanup using fake broker/key services where appropriate.

### 7. Static Showcase Page

- ⬜️ Create `code/public/showcase.html` as a static page, not a Blade view or authenticated Laravel route.
- ⬜️ Rewrite test-fixture language into user-facing showcase language while preserving clear expected behavior for each example.
- ⬜️ Present each example with the public source image and protected Capsule side by side so visitors can compare ordinary hosting with Capsule-gated viewing.
- ⬜️ Clearly explain in-page that showcased source images are intentionally public demo material.
- ⬜️ Point showcase examples at stable public Capsule URLs under `/showcase/capsules/`.
- ⬜️ Ensure Viewer install fallback links point users back to `/showcase.html` after installation or connection.
- ⬜️ Keep time-dependent, expired, revoked, or unavailable examples clearly labeled so users understand locked states are intentional.

### 8. Verification

- ⬜️ Verify the shared TypeScript package and extension Creator workflow produce equivalent deterministic outputs for the covered fixtures.
- ⬜️ Verify before/after baseline artifacts remain equivalent after extraction or explicitly document reviewed intentional differences.
- ⬜️ Verify public API routes, broker routes, Capsule format identifiers, and Viewer-facing manifest shape did not change as part of showcase automation unless an intentional release note is added.
- ⬜️ Verify the generation command creates all expected `.capsule` files from the checked-in source images.
- ⬜️ Verify generated Capsules reference production-compatible CTX and broker identities, not localhost fixture services.
- ⬜️ Verify `showcase.html` loads publicly without authentication.
- ⬜️ Verify `showcase.html` does not depend on Laravel session state or account cookies.
- ⬜️ Verify source image and Capsule URLs return anonymous `GET` and `HEAD` responses with bounded content length.
- ⬜️ Verify the store-installed Viewer can render or correctly deny each showcased Capsule according to expected policy behavior.
- ⬜️ Verify optional revoked example is actually revoked through lifecycle services, not simulated only by page copy.

### 9. Cleanup And Documentation

- ⬜️ Review `_examples/static-host` after migration and decide which files remain as independent static-host reference fixtures.
- ⬜️ Remove only duplicated or obsolete static-host fixture files whose role is fully replaced by the showcase or another retained reference fixture.
- ⬜️ Update `_examples/static-host/README.md` to distinguish the Laravel-hosted showcase from the separate static-host reference implementation.
- ⬜️ Update extension release evidence if the shared-package refactor changes the production extension bundle.
- ⬜️ Update Phase 12 runbook or release evidence if the showcase becomes part of invited-user readiness.

## Success Goals

- A maintainer can regenerate showcase Capsules repeatably through a manual Artisan command without using login credentials, OAuth refresh tokens, browser sessions, or extension private keys.
- Generated Capsules are production-compatible and use real broker registration/finalization lifecycle behavior.
- Partial generation failures do not leave public orphaned Capsules or indefinitely releasable broker material.
- A visitor can open `https://sharecapsules.com/showcase.html` and understand the main Capsule policy types.
- The page uses the same static-host markup shape that compatible Hosts are expected to use.
- Each showcased policy uses a distinct source image so examples are easy to distinguish visually.
- The side-by-side layout helps visitors understand the difference between ordinary public media and protected Capsule viewing.
- Users without the Viewer see a clear install path.
- Users with the store-installed Viewer can try real Capsule examples.
- Locked, expired, revoked, or unavailable examples fail in understandable, expected ways.
- The separate static reference Host task remains explicitly separate.
- The migration avoids carrying two confusing copies of the same showcase material unless both have distinct documented purposes.

## Open Questions

- Should the first implementation use an encrypted persistent showcase signing key, or generate a fresh automation signing key each time Capsules are regenerated?
- Should the system-owned showcase creator be provisioned by a one-time Artisan command or selected by environment configuration from an existing verified account?
- Should generated showcase Capsule registry records be hidden from normal creator inventory, visibly labeled as showcase-owned, or managed through a dedicated operational view?
- Should dynamic relative-time examples, such as "expires in 2 days," wait for a later regeneration mode after fixed examples are working?
- Should `/showcase.html` be linked from the public navigation immediately, or shared only with invited users at first?

## Follow-Up Ideas

- Add dynamic showcase regeneration for relative examples, such as "opens in 2 days" or "expired 2 days ago," after fixed examples are stable.
- Promote manual showcase regeneration to a scheduled job only after the command is deterministic, idempotent, cleanup-safe, observable, and operationally boring.
- Publish the same showcase content to the separate static reference Host once the Phase 12 independent-host validation path is ready.
