# Scope and Non-Goals

Status: Draft
Last updated: 2026-06-18

## Purpose

Clarify what Capsule and CTX currently intend to solve and prevent adjacent expectations from silently expanding the system.

## In scope

- A portable package for encrypted creator content
- Creator signatures protecting package authenticity and policy integrity
- Creator-defined access policy
- Evaluation of credentials, reputation dimensions, activity limits, and risk assertions
- Trusted Viewer software for authorization, decryption, and rendering
- Voluntary, consented Capsule-session telemetry
- Persistent Share Capsules accounts and reputation continuity
- Multiple trust providers and eventual service portability
- Abuse detection, revocation, and step-up verification
- Privacy-preserving or minimally revealing evidence presentation

## Primary V1 scenario

V1 serves an independent visual artist who publishes a static gallery page on a creator-selected Host. The page declares several protected Capsules through `<capsule-viewer>` elements with public fallback previews. Each Capsule is an independently signed and encrypted package containing one small image payload and its own embedded, creator-signed access policy.

A viewer uses a verified Share Capsules account and the Chromium extension to request, decrypt, and render Capsules inside extension-origin inline frames. Site-scoped standing consent may allow eligible Capsules to open automatically. The Host remains a static distributor and placement surface; it does not participate in identity, trust evaluation, authorization, key release, or plaintext rendering.

The image gallery is the first implementation profile, not a limitation of the Capsule format. Capsule is a generic wrapper for arbitrary binary media; other Viewer profiles may support text, audio, video, documents, archives, or future content types.

## Priority protected content

The highest-priority content classes are:

- Raster images
- Plain text and HTML-based documents
- PDF documents
- Office-style documents, including word-processing documents and spreadsheets such as DOCX and XLSX

These priorities do not imply that every source format may execute or render directly inside the Viewer. Each supported content profile must define a safe local rendering model, active-content restrictions, resource limits, and whether the creator packages the source file or a protected static rendition.

## Non-goals

### Perfect copy prevention

The system cannot prevent an authorized human from recording or reproducing rendered content.

### Universal determination of moral trust

CTX does not calculate whether a person is good, worthy, or trustworthy in every context.

### Guaranteed proof of future human intent

Evidence that a viewer is likely human does not prove that the viewer will not harvest content or assist an automated system.

### A single global reputation currency

Trust is not fungible or transferable. CTX does not define a blockchain token or universal score that can be bought, sold, or moved between people.

### General browser surveillance

The Viewer must not monitor unrelated browsing, other applications, searches, purchases, messages, or general device activity.

### Mandatory legal identity

The current direction does not require every Share Capsules account to disclose government identity or biometrics. Higher-assurance personhood or identity credentials may be optional policy inputs.

### Guaranteed one-human-one-account

V1 cannot prove that one natural person controls only one Share Capsules account. It provides persistent account continuity and raises the cost of replacement without presenting per-account policy as a per-person guarantee.

### Permanent dependence on Share Capsules

A centralized V1 service is acceptable. Permanent protocol dependence on that operator is not the long-term intent.

### Hosting platform replacement

Capsule is a distribution format, not a social network, marketplace, publishing platform, or content host.

Share Capsules does not provide general-purpose creator-content hosting in V1. The project provides a static reference Host to demonstrate how independent hosting works.

## Provisional boundaries

- Telemetry is limited to protected Viewer sessions and, with additional consent, relevant interaction on the surrounding page.
- Human challenges are step-up evidence, not a durable source of reputation.
- Share Capsules account creation begins with minimal information and low initial trust.
- More disclosure can enable more access, but creators may offer alternate verification paths.

## Related documents

- [Vision and problem](vision-and-problem.md)
- [Design principles](principles.md)
- [Privacy model](../07_security-and-privacy/privacy-model.md)
