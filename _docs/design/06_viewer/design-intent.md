# Viewer Design Intent

Status: Draft
Last updated: 2026-06-19

## Purpose

Define the trusted Viewer's intended responsibility and boundaries.

## Intent

The Viewer is the software trust boundary between an untrusted Host, CTX services, and protected plaintext content.

It is responsible for:

- Opening a Capsule
- Verifying creator signatures and package integrity
- Showing verified signed metadata and distinguishing it from untrusted Host fallback content
- Explaining creator policy requirements
- Obtaining informed disclosure consent
- Presenting credentials and evidence
- Completing authorization and step-up flows
- Obtaining or deriving decryption material
- Decrypting and rendering content locally
- Measuring only explicitly authorized session activity

## V1 browser direction

The preferred V1 Viewer is a desktop browser extension. Host-supplied JavaScript must not be trusted with credentials, authorization, keys, plaintext, or authoritative telemetry.

The extension owns a registered device-key set with separate proof and agreement keys, verifies Capsules, manages consent and CTX interaction, receives wrapped content keys, decrypts locally, and renders protected content in an extension-origin inline frame. A full-page extension-controlled view remains available as the clearer higher-assurance presentation.

Content rendering is provided through a registry of trusted, versioned content-profile implementations. V1 ships only an image profile. Future content types are added behind the same interface without changing generic Capsule, CTX, or key-release behavior. Capsules identify required profiles but never supply executable Viewer code.

The Host declares a Capsule URL and accessible fallback through `<capsule-viewer>`. The Capsule remains an encrypted file; the extension-origin iframe is the protected rendering surface, not the Capsule itself. A server-delivered web Viewer may be supported later at a separately defined lower assurance level.

## Telemetry boundary

The Viewer may observe protected-session interaction after explicit consent. Relevant surrounding-page observation may be enabled separately.

The Viewer must not become a general browsing tracker. It must exclude unrelated tabs, applications, browsing history, and typed content.

## User experience

The Viewer should clearly communicate:

- What the creator requires
- Which data or predicates will be disclosed
- Who receives the evidence
- Whether access is one-time or persistent
- What happens if the viewer declines
- Whether telemetry is active
- Whether site-scoped automatic opening is active and how to revoke it
- Available alternative verification methods

## Limits

The Viewer runs on a device controlled by its user. A determined authorized recipient may modify software, extract decrypted content, record output, or compromise credentials. The design should reduce casual and scalable abuse without claiming an invulnerable client.

## Future implementations

- Native desktop applications
- Mobile applications
- Lower-assurance web Viewers
- Multiple trusted web Viewer origins

V1 does not provide a server-decrypted or Host-page JavaScript fallback. A future full-page web Viewer may decrypt client-side under a separately identified lower assurance profile that creators can explicitly accept or reject. See [Viewer fallback and assurance](fallback-and-assurance.md).

## Open questions

- What assurance and presentation constraints apply to future non-extension inline Viewers?
- What telemetry can the extension collect authoritatively?
- How are accessibility and alternate interaction modes supported?
- How does a viewer verify that installed software is authentic and current?

## Related documents

- [System overview](../03_architecture/system-overview.md)
- [Browser Viewer](browser-viewer.md)
- [Viewer content profiles](content-profiles.md)
- [Access and data flow](../03_architecture/access-and-data-flow.md)
- [Reputation and signals](../05_ctx/reputation-and-signals.md)
- [Privacy model](../07_security-and-privacy/privacy-model.md)
- [Viewer fallback and assurance](fallback-and-assurance.md)
