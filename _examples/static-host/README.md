# Static host example

This directory shows the minimum host-side shape for publishing Capsules on an ordinary static site.

## Contents

- `index.html` — a static page containing two `<capsule-viewer>` elements.
- `capsules/tekfoundry-logo.capsule` — encrypted Capsule file.
- `capsules/eclipse-photo.capsule` — encrypted Capsule file.

## Not included

The Creator workspace recovery files are intentionally not included:

- no `recovery/` directory
- no recovery code
- no `workspace.json`
- no source images

The example Capsules were created against local development services, so their manifests reference `localhost:3003` and `localhost:3004`. They are intended for local static-host testing, not production viewing.
