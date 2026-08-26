# Product Overview

Status: Current implemented behavior
Last updated: 2026-08-26

## Purpose

Share Capsules is the first reference implementation of two experimental open
technologies:

- **Capsule**, a portable creator-signed package for encrypted content and
  signed access policy.
- **Capsule Trust Exchange (CTX)**, a protocol for evaluating that policy and
  authorizing a trusted Viewer to receive a content key.

The product is intended to reduce effortless, anonymous, large-scale harvesting
of publicly distributed work. It does not promise perfect copy prevention,
proof of benign human intent, one-human-one-account, or protection from misuse
by an authorized viewer.

## Current Product Slice

The current implementation supports the initial end-to-end proof of concept:

1. A creator creates and verifies a Share Capsules account.
2. The creator connects the official Chrome/Chromium extension through OAuth.
3. Creator tooling validates a static JPEG, PNG, or WebP, encrypts it locally,
   registers the content key with the broker, signs a Capsule, and exports a
   `.capsule` file.
4. The creator hosts the Capsule on ordinary HTTPS infrastructure and embeds a
   `<capsule-viewer>` element with public fallback content.
5. A viewer uses the extension, a verified account, a registered device, site
   permission, and policy disclosure consent to request access.
6. CTX evaluates the signed policy, the broker commits a release, and the
   extension decrypts and renders locally.
7. Account closure, permanent deletion, Capsule revocation, key destruction,
   and retention controls keep lifecycle behavior explicit.

Implementation evidence includes Laravel account and Studio routes in
`code/routes/web.php`, extension APIs in `code/routes/api.php`, CTX and broker
routes in `code/bootstrap/app.php` and `code/routes/broker-api.php`, browser
extension modules under `code/apps/browser-extension/src/`, shared TypeScript
packages under `code/packages/`, and operational runbooks under
`_docs/operations/`.

## Primary Actors

- **Creator:** packages content, signs Capsules, selects policy gates, manages
  Capsule inventory, and can pause, resume, revoke, or delete Capsule access.
- **Viewer:** uses trusted Viewer software to connect an account, register a
  device, grant site permission, consent to policy disclosure, and open
  authorized content.
- **Host:** serves encrypted `.capsule` files and public fallback markup. It is
  not trusted with account credentials, policy evidence, content keys, or
  plaintext.
- **Share Capsules CTX Provider:** evaluates policies, account/device state,
  consent, limits, challenge evidence, automation risk, and revocation.
- **Share Capsules Key Broker:** stores protected content keys, validates
  tickets and device proofs, commits releases through the control plane, and
  returns HPKE-wrapped content keys.
- **TekFoundry:** sponsors and initially maintains the reference
  implementation without owning the open protocol space.

## Creator Experience

The V1 creator flow uses one account and one coherent product surface even
though the system keeps CTX Provider, Trust Provider, and Key Broker roles
separate internally.

The creator:

- registers and verifies an account;
- connects the official extension;
- chooses a local workspace and confirms creator signing-key recovery;
- provides a title, optional public description, and one supported local image;
- configures optional opening and closing instants, global opening limits,
  per-viewer-account limits, and the automation-risk gate;
- creates and exports the `.capsule` file;
- copies generated `<capsule-viewer>` markup and public fallback content;
- manages created Capsule inventory, labels, metrics, pause/resume, revocation,
  and deletion.

The current authenticated Laravel shell provides Dashboard, Capsules, Account,
and Sign out navigation. Major status changes and destructive actions use a
confirmation dialog, while server-side authorization, recent authentication,
CSRF, validation, and throttling remain authoritative.

## Viewer Experience

The V1 viewer flow is:

1. Install the official Chrome/Chromium extension.
2. Create or connect a Share Capsules account and verify email.
3. Register the Viewer installation as a device.
4. Grant site permission for the Host and decide whether eligible Capsules may
   open automatically on that site.
5. Review CTX disclosure and consent when standing consent does not already
   cover the policy.
6. View authorized content inside an extension-controlled inline frame or full
   Viewer surface.

Viewer-facing copy should use product language such as "Connect Share
Capsules", "Access requirements", and "View limit reached"; it should not ask
ordinary users to reason about JWTs, HPKE, DPoP, broker audiences, or internal
service roles.

## UX Principles

- Keep creator intent and content visually primary.
- Make security state explicit and legible.
- Hide routine protocol complexity without concealing meaningful trust,
  privacy, consent, or counting behavior.
- Use accessible fallbacks and visible keyboard focus.
- Respect reduced-motion preferences.
- Avoid presenting trust as a leaderboard, universal score, currency, or moral
  judgment.
- Keep Capsule-specific moments visually bounded from ordinary account and
  management surfaces.

## Metrics Surface

The implemented metrics foundation records provider-aware events and
idempotent projections for authorization attempts, approvals, privacy-safe
denials, broker-committed releases, and lifecycle events. Creator-facing
metrics are operational and policy-management signals, not audience profiling.

Creators may see Capsule-level totals, bounded buckets, safe denial categories,
limit status, freshness, and suppression explanations. They must not receive
viewer identifiers, global account identity, individual access timelines, exact
per-viewer timestamps, raw trust evidence, raw denial context, IP addresses,
user agents, or device identifiers.

## Sponsorship And Public Positioning

Project materials should describe Capsule and CTX as experimental open
technologies sponsored and initially maintained by TekFoundry. Share Capsules
is the first reference implementation and official network, not the only
possible CTX Provider, Key Broker, Viewer, or creator tool.

## Deferred Product Scope

Deferred or future product work includes third-party provider recognition,
mobile and cross-browser Viewers, additional content profiles, adaptive
renditions, chunking/streaming, stronger optional identity or personhood
credentials, richer analytics dimensions, provider portability, and broader
federation governance.

## Migration Coverage

Detailed legacy-to-KB provenance is tracked in the
[migration inventory](../migration-inventory.md). Product-specific durable
facts now live in this area and the linked detailed pages in its README.
