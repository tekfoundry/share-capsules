# Viewer Fallback and Assurance

Status: Draft
Last updated: 2026-06-19

## Purpose

Define V1 behavior when the trusted browser extension is absent or unsupported and preserve a path to future Viewer implementations without weakening creator expectations.

## V1 assurance boundary

The Share Capsules browser extension is required in V1 for both:

- Creating a real Capsule with a creator-controlled signing key and locally encrypted payload
- Authorizing, decrypting, and rendering protected Capsule content

V1 does not provide Host-page JavaScript decryption, a general Share Capsules web Viewer, or server-side plaintext rendering.

This is a deliberate product boundary, not a protocol claim that extensions are the only possible Viewer forever.

## Why Host-page JavaScript is not a fallback

JavaScript executing in the Host page shares a security environment controlled by the Host. If it received a content key or plaintext, Host scripts could inspect, copy, or exfiltrate that material.

The V1 content script may discover `<capsule-viewer>` elements and insert an extension-origin frame, but it never decrypts into the Host DOM or gives page JavaScript privileged Viewer capabilities.

## Why server-side decryption is not a fallback

A server-rendered fallback would require Share Capsules or another web service to receive the content key or plaintext. That would materially weaken the preferred creator-ownership and local-decryption model, expand breach impact, and create a different assurance promise.

V1 Laravel services evaluate policy and coordinate authorization; they do not decrypt Capsule payloads or render creator plaintext.

## No-extension viewer experience

Every structured `<capsule-viewer>` may contain ordinary accessible `<fallback>` content, normally a public preview, explanation, and link to a Share Capsules opening page. Legacy unstructured child content is treated only as public fallback during migration.

When the extension is missing:

1. The Host displays the fallback content.
2. The viewer follows the fallback link to `sharecapsules.com`.
3. Share Capsules explains the protected-content model and why the trusted extension is required.
4. A supported Chromium user receives a link to the official Chrome Web Store listing.
5. After installation, the viewer connects or creates a Share Capsules account, verifies email, approves the extension, and grants the necessary site permission.
6. The flow resumes the original Capsule or returns the viewer to the Host page.

The resume mechanism carries only the Capsule or return location and short-lived onboarding state. It must not place account credentials, OAuth tokens, authorization tickets, trust evidence, or content keys in URLs.

Unsupported browsers receive an honest compatibility explanation and retain access to public fallback content. V1 does not claim protected-content support where the trusted Viewer is unavailable.

## No-extension creator experience

The Laravel Creator Studio may allow a signed-in creator to view documentation or prepare a draft policy without the extension. It must not claim to create a production Capsule without trusted local creator tooling.

When creation reaches file selection, key generation, encryption, signing, packaging, or export, Creator Studio requires the Share Capsules extension and directs the creator to its official installation flow. Laravel does not temporarily accept plaintext or creator signing keys as a compatibility shortcut.

## Distribution

The production V1 extension is distributed through the official Chrome Web Store listing under the Share Capsules publisher identity. The production OAuth client is bound to the fixed production extension identifier.

Development builds use a separate extension identifier, credentials, and environment. They must not silently connect to production accounts or key-release services.

The extension contains no remotely hosted executable code. Store updates are signed and automatic. Source code, release identifiers, and build hashes should be published, with reproducible builds as a project goal. CTX may reject a known-vulnerable or unsupported Viewer version and may suspend a compromised release.

## Future client-side web Viewer

A future full-page Share Capsules web Viewer may provide broader browser support without server-side decryption. It could:

- Run at a trusted Viewer origin rather than inside the Host page
- Fetch the public encrypted Capsule through CORS
- Use browser cryptography and local device keys
- Perform CTX authorization
- Decrypt and render locally in that origin

Because its executable code is delivered dynamically on each visit, it has a different assurance level from an installed and reviewable extension release. The Viewer architecture and Capsule policy must identify assurance capabilities explicitly so creators can allow or reject a web Viewer.

A future web Viewer is an additional profile, not a silent fallback that changes the guarantees of existing Capsules.

## Related documents

- [Browser Viewer](browser-viewer.md)
- [Viewer design intent](design-intent.md)
- [End-to-end Capsule access and data flow](../03_architecture/access-and-data-flow.md)
- [V1 creator and viewer experience](../02_product/v1-user-experience.md)
- [Privacy model](../07_security-and-privacy/privacy-model.md)
