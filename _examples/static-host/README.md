# Static host example

This directory shows the minimum host-side shape for publishing Capsules on an ordinary static site.

## Contents

- `index.html` — a static page containing multiple `<capsule-viewer>` examples using the target host markup syntax.
- `test.html` — a focused Phase 8 policy-fixture page for checking Time, Limit, Trust, revocation, combined-gate, and bulk-page safety behavior.
- `cross-origin-permissions.html` — a focused Phase 8 fixture for separately hosted page and Capsule origins.
- `capsules/tekfoundry-logo.capsule` — encrypted Capsule file.
- `capsules/eclipse-photo.capsule` — encrypted Capsule file.
- `capsules/time-capsule-open-in-future.capsule` — encrypted Time Capsule fixture with a future not-before gate.
- `capsules/time-capsule-open-in-past.capsule` — encrypted Time Capsule fixture with a past not-before gate and no closing date.
- `capsules/time-capsule-not-after-in-the-past.capsule` — encrypted Time Capsule fixture with a past not-after gate that should stay locked.
- `capsules/time-capsule-not-after-in-the-future.capsule` — encrypted Time Capsule fixture with a future not-after gate that should open.
- `capsules/time-capsule-in-between-before-and-after.capsule` — encrypted Time Capsule fixture with a current valid access window that should open.
- `capsules/limit-capsule-per-account-limit-of-5.capsule` — encrypted Limit Capsule fixture with a per-user account opening limit of five.
- `capsules/limit-capsule-global-limit-of-15.capsule` — encrypted Limit Capsule fixture with a Capsule-global opening limit of fifteen.
- `capsules/revoked-capsule-baseline.capsule` — encrypted baseline-policy Capsule fixture whose local registry record should be permanently revoked before testing.
- `capsules/trust-capsule.capsule` — encrypted Trust Capsule fixture with the V1 automation-risk gate.
- `capsules/combined-capsule.capsule` — encrypted combined-gate Capsule fixture with Time, Limit, and Trust requirements in one ordinary Capsule manifest.

## Not included

The Creator workspace recovery files are intentionally not included:

- no `recovery/` directory
- no recovery code
- no `workspace.json`
- no source images

The example Capsules were created against local development services, so their manifests reference `localhost:3003` and `localhost:3004`. They are intended for local static-host testing, not production viewing.

## Syntax note

The page shows the intended Host authoring contract:

- `<fallback>` for public no-extension content.
- `<template>` for Host-owned opened layout.
- `<content>` where the extension will place the secure Viewer iframe.
- optional `<error>` for safe failure copy.

The Viewer keeps decrypted content inside extension-origin frames. Host markup controls the public page structure, fallback copy, safe error copy, and the styling surface around the protected content placeholder.

## Bulk-page safety check

The policy-fixture page includes a dedicated `#bulk-page-safety` section with Capsules inside ordinary Host show/hide patterns:

- an accordion panel that starts open
- an accordion panel that starts closed
- a tab, carousel, or modal-style panel that starts hidden

These patterns are intentionally allowed because ordinary static sites often render content this way. Visibility alone is not the safety boundary. The Viewer should use scoped consent, one-at-a-time same-page queueing, retry-aware handling for temporary failures and rate limits, lifecycle checks, and page/session bulk protections.

No committed release should be created by connecting an account, approving disclosure, hidden markup, denied policy checks, revocation, or an unredeemed ticket. Only a successful broker key release counts as an opening.

## Local host contract check

The local helper intentionally stays simple. Current verification confirms:

- anonymous `GET` and `HEAD` work for the example page and checked-in Capsule files
- Capsule URLs are stable relative paths under `./capsules/`
- Capsule files are served as `application/octet-stream`
- `Content-Length` matches the checked-in archives
- file sizes are bounded for local examples
- no creator recovery files, recovery code, workspace metadata, or source images are included

Production static hosts still need a separate check for public noncredentialed CORS, immutable revision URLs, cache behavior, and any final Capsule media-type conventions.

## Representative static Host deployment: GitHub Pages

GitHub Pages is a representative compatible Host when the public page and Capsule files are published from the same static site origin. It serves checked-in files over HTTPS with ordinary anonymous `GET` and `HEAD` requests, so the Host does not need Share Capsules accounts, viewer accounts on the Host, cookies, server-side code, plugins, a database, CTX logic, broker credentials, or access to the original plaintext.

Use this shape for a same-origin static deployment:

```text
/
  index.html
  capsules/
    eclipse-photo.capsule
    tekfoundry-logo.capsule
```

Then reference the Capsule with a same-origin URL:

```html
<capsule-viewer src="./capsules/eclipse-photo.capsule">
  <fallback>
    <p>Install or enable the Share Capsules Viewer to open this Capsule.</p>
  </fallback>
  <template>
    <content></content>
  </template>
</capsule-viewer>
```

Deployment checklist:

- publish the HTML page and `.capsule` files from the same public Pages site when possible
- keep the repository or published artifact public for the hosted files; do not depend on private-repository redirects, signed URLs, login walls, cookies, or viewer GitHub accounts
- use stable revisioned Capsule filenames or paths when replacing content, such as `capsules/eclipse-photo-r2.capsule`, so old pages and caches do not silently point at different encrypted bytes
- keep no-extension install links limited to ordinary public return navigation back to the hosted page
- verify after publish that the page and Capsule URLs return `200` to anonymous `GET` and `HEAD`, that the Capsule response has a bounded `Content-Length`, and that the downloaded bytes match the intended `.capsule` file
- if the page and Capsule are split across different origins, use a static Host that allows public noncredentialed CORS for the Capsule origin and run the cross-origin Host permission check below

This recipe intentionally documents only the Host boundary. A production release still needs Phase 11 validation for exact public URLs, final media-type conventions, cache headers, CORS behavior for any split-origin deployment, extension distribution identity, and production CTX/broker configuration.

## Cross-origin Host permission check

Use `cross-origin-permissions.html` when the HTML page and Capsule files are deployed on different HTTPS origins. The expected Viewer behavior is:

- granting the page origin lets the extension discover `<capsule-viewer>` elements on that page
- granting the page origin does not authorize fetching a Capsule from a separate origin
- the Viewer asks for the Capsule origin before making the Capsule request
- a redirect to a third Capsule origin stops before the final fetch until that redirected origin is also granted

The automated extension tests lock the same rule at the fetch boundary so a separately hosted Capsule origin or redirected final origin cannot be fetched with only the page origin grant.

The policy-fixture page should collect behavior-oriented test cases. Keep polished markup examples on `index.html`; add gate-specific test Capsules to `test.html` so each fixture can document its expected locked or opened state.

Each fallback example includes a local development install/onboarding link:

`http://localhost:3003/viewer/install?return_to=http%3A%2F%2Flocalhost%3A8088%2F`

The `return_to` value is ordinary page navigation back to the public static page. It must never contain account credentials, authorization codes, tokens, CTX tickets, proofs, recovery material, or content keys.
