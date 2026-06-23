# Browser Viewer

Status: Draft
Last updated: 2026-06-19

## Purpose

Define the browser-extension implementation selected as the preferred trusted Viewer for V1.

## V1 direction

V1 targets a desktop browser extension, initially for one Chrome/Chromium-compatible platform. Cross-browser and mobile implementations follow after the core authorization and rendering model is validated.

The extension is implemented in TypeScript and shares a versioned Capsule client library with creator-side Capsule construction.

The extension is the trusted decryption and consent runtime. It is not merely a bridge that shares a Share Capsules account identifier with a webpage.

## Responsibilities

The extension:

- Maintains a registered device-key set with separate proof and agreement keys
- Discovers explicit `<capsule-viewer>` elements on approved Host origins
- Inserts extension-origin inline Viewer frames while preserving accessible fallback content
- Fetches Capsules with narrowly granted permission
- Verifies creator signatures and manifest integrity
- Presents policy and disclosure requests
- Proves account and device control using signed challenges
- Receives short-lived authorization
- Obtains wrapped content keys
- Decrypts and renders protected payloads locally
- Records a view only after explicit consent and successful key release
- Keeps credentials, keys, and plaintext away from Host JavaScript

Generic Capsule processing and content-specific rendering are separated. The extension resolves the signed manifest's content-profile identifier through a local registry of trusted implementations. V1 includes only the image profile; unsupported profiles fail closed. Capsules and Hosts cannot provide executable renderer code. See [Viewer content profiles](content-profiles.md).

## Presentation

The primary V1 presentation is an extension-origin iframe inserted for a declarative `<capsule-viewer src="...">` element. The Host supplies the Capsule URL and fallback content but does not receive protected information. The inline frame starts locked, owns trusted status and error presentation, and renders plaintext only inside the extension origin.

Successful opened states are content-first: routine technical status, Capsule URLs, and Viewer branding stay out of the visible embedded result unless the Viewer needs an action or error. Hosts may opt into production-safe troubleshooting with `<capsule-viewer debug>`, which enables extension-console diagnostic events only. Debug events must never include OAuth tokens, tickets, DPoP proofs, content keys, plaintext bytes, recovery material, account identifiers, or other secrets.

Host pages can style ordinary Host-owned layout around the protected viewing surface, but cannot style decrypted plaintext directly inside the extension iframe. The target Host syntax uses `<fallback>` for no-extension content, `<template>` for the Host-owned opened layout, optional `<error>` for safe failure layout, and a `<content>` placeholder that the extension replaces with an extension-origin iframe. Classes and inline styles on the placeholder apply to the iframe shell; the Host's CSS does not cross into decrypted content. The current Phase 7 implementation also supports the transitional `fit="contain|cover|fill|full-height|scale-down"` and `viewer-height` attributes while the structured authoring contract is implemented. See [Viewer Host Markup](host-markup.md).

Viewer failures are mapped to reviewed, user-safe categories rather than raw protocol detail. Broker CTX errors such as invalid or stale tickets, invalid device proof, unavailable release, opening limits, policy mismatch, automation protection, temporary service failures, and HTTP rate limiting produce actionable messages while keeping tickets, proofs, keys, identifiers, and broker internals out of the Host page. Broker verification dependencies, including CTX provider signing-key lookup, must fail as retryable temporary availability problems rather than as viewer-blaming ticket failures.

Every open requires a fresh online access decision and key release. The unwrapped content key and plaintext exist only in memory for the current Viewer session and are discarded when it closes. V1 does not support offline viewing. Reloading or reopening begins a new request and counts as another view only if key release succeeds.

Multiple same-page Viewer frames may observe the same account connection and continue automatically, but the extension serializes the online authorization, broker release, and decrypt/render opening pipeline. This avoids bursty release attempts, makes local development deterministic, and creates a clear future boundary for deliberate open-all and lazy automatic opening policy.

The Host cannot read the cross-origin frame DOM, keys, object URLs, or plaintext, but it can resize, cover, move, or remove the frame. Each frame therefore offers a full-page extension-controlled presentation as a higher-assurance fallback.

Server-delivered web frames remain a separate lower-assurance future option.

## Automatic opening

Site permission and automatic-opening consent are separate. After a viewer explicitly allows automatic opening for a Host site, eligible Capsules may authorize and render automatically as they approach the viewport using the existing CTX account connection and standing disclosure consent.

Viewer account connection is extension-wide. If one `<capsule-viewer>` frame completes or refreshes the Viewer session, other frames on the same page observe the shared credential update from extension storage and continue from their own verified state without asking the viewer to press Connect again.

Automatic opening is revocable per site, re-prompts when policy or disclosure meaning changes, avoids key release for hidden elements, applies a safety limit to unusual bulk pages, and explains that committed releases count against Capsule limits. Without standing consent, frames remain locked and support individual activation or one action to open all currently eligible Capsules.

## Communication boundaries

Only isolated content scripts on viewer-approved top-level HTTPS origins and explicitly allowlisted Share Capsules or compatible CTX Viewer origins may initiate narrowly defined extension communication. Every message is treated as untrusted input until its sender, document, schema, challenge, freshness, and requested operation are validated.

The content script communicates only the Capsule element URL and generic frame lifecycle. The extension must not expose the global Share Capsules account identifier to the Host. It returns no credentials, authorization tickets, keys, plaintext, or detailed trust results to page scripts.

## Share Capsules account connection

The V1 extension uses OAuth Authorization Code with PKCE (`S256`) through Chrome's extension identity flow. The user authenticates and approves the connection on Share Capsules, so the extension never receives or stores the account password.

The OAuth client has no embedded secret. Redirect URIs are registered exactly. The first approval returns a short-lived `extension:connect` bearer token that can register device keys but cannot call CTX protected resources and has no usable refresh token. After registration, a second PKCE approval requests only `ctx:authorize` and proves the registered Ed25519 key at the token endpoint. It returns a ten-minute `DPoP` access token and a rotating 30-day refresh token bound to that key. The separate X25519 agreement key receives HPKE-wrapped content keys. Device Authorization may be added later for platforms where the redirect flow is unsuitable.

The extension stores the refresh token only in extension-owned state and uses a fresh DPoP proof for every refresh. It replaces the stored refresh token atomically after a successful rotation and never retries an ambiguous refresh with the old token without first resolving the result. Reuse of a rotated token revokes the device's token family. Device suspension or revocation has the same immediate effect, and reactivation requires fresh authorization.

After the first OAuth approval, the extension creates separate non-exportable Ed25519 proof and X25519 agreement private keys and stores their `CryptoKey` objects in extension-owned IndexedDB. Registration succeeds only after a server challenge verifies an Ed25519 signature and an independent X25519-derived confirmation over the same versioned message. Public JWK thumbprints identify the key set; private key material never enters Laravel or the Host page.

## Permissions

V1 declares these required named permissions:

- `identity` for the OAuth authorization flow
- `storage` for non-plaintext extension settings and consent state
- `scripting` to register the isolated Capsule element bridge on approved sites

It has required Host access only to `https://sharecapsules.com` and declares optional `https://*/*` Host access so the viewer can grant one HTTPS origin at runtime. The development build also declares required localhost HTTP origins for the bundled static-host example because Chrome does not offer a reliable manual UI for arbitrary optional localhost ports. Chrome Host grants apply to an origin rather than one Capsule path. A page origin and separately hosted Capsule origin may each require approval.

V1 does not request Chrome profile identity, general `tabs`, history, cookies, downloads, `webRequest`, native messaging, or public HTTP Host access. It does not register an install-time all-sites content script. Dynamically registered content scripts run only in the isolated world on approved top-level origins.

## Code trust

The Viewer should be open source and packaged for review. Reproducible builds and independent audits are desired so creators and viewers can compare distributed artifacts with reviewed source.

Store review and signed distribution improve integrity but do not make the Viewer immune to malicious updates, browser compromise, or user modification.

## Distribution and fallback

V1 protected creation and viewing require the official Share Capsules Chrome/Chromium extension. The official Chrome Web Store listing is the normal install path, with a fixed production extension ID bound to production OAuth registration. Development builds use separate identity and credentials.

When the extension is absent, `<capsule-viewer>` fallback content links to a Share Capsules install and onboarding page that can resume the original Capsule without putting credentials or authorization material in the URL. V1 does not decrypt through Host-page JavaScript or Laravel. See [Viewer fallback and assurance](fallback-and-assurance.md).

## Limits

The extension cannot prevent screenshots, external recording, modified browsers, compromised devices, or an authorized human from misusing rendered content. It raises the cost and accountability of scalable harvesting; it does not create a perfect client-side security boundary.

## Open questions

- What protections are practical against modified extensions or browsers?
- Which capabilities define lower and higher Viewer assurance levels?

## Related documents

- [Viewer design intent](design-intent.md)
- [Access and data flow](../03_architecture/access-and-data-flow.md)
- [Accounts and identity](../03_architecture/accounts-and-identity.md)
- [Share Capsules reference implementation](../03_architecture/share-capsules-reference-implementation.md)
- [Viewer content profiles](content-profiles.md)
- [Viewer fallback and assurance](fallback-and-assurance.md)
- [Viewer Host Markup](host-markup.md)
