# Static host example

This directory shows the minimum host-side shape for publishing Capsules on an ordinary static site.

## Contents

- `index.html` — a static page containing two `<capsule-viewer>` elements using the target host markup syntax, plus additional syntax examples.
- `capsules/tekfoundry-logo.capsule` — encrypted Capsule file.
- `capsules/eclipse-photo.capsule` — encrypted Capsule file.

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

The current Phase 7 runtime still supports transitional `fit` and `viewer-height` attributes while full structured-template activation is being implemented.

Each fallback example includes a local development install/onboarding link:

`http://localhost:3003/viewer/install?return_to=http%3A%2F%2Flocalhost%3A8088%2F`

The `return_to` value is ordinary page navigation back to the public static page. It must never contain account credentials, authorization codes, tokens, CTX tickets, proofs, recovery material, or content keys.
