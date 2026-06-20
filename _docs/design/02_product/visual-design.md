# Visual Design

Status: Accepted
Last updated: 2026-06-20

## Purpose

This document defines the visual direction for the Share Capsules reference implementation. It keeps account and policy workflows clear and approachable while giving protected Capsule interactions a distinct, trustworthy identity.

## Direction

Share Capsules uses **Contemporary Utility with Digital Artifact moments**.

Contemporary Utility is the default language for navigation, accounts, forms, devices, policies, settings, documentation, and status information. These surfaces should feel bright, calm, precise, and easy to scan.

Digital Artifact styling is reserved for Capsule-specific moments: protected content, Viewer state, policy evaluation, authorization, and key release. These surfaces may use deep navy backgrounds, fine borders, compact technical labels, and restrained status accents. The contrast should make a Capsule feel like a deliberate security boundary without making the entire application feel dark or intimidating.

## Principles

- Creator intent and content remain visually primary.
- Security state is explicit, legible, and never merely decorative.
- Trust and reputation are not presented as games, currencies, leaderboards, or social status.
- Avoid cryptocurrency imagery, surveillance imagery, excessive glow, and theatrical hacker aesthetics.
- Animation should be restrained and functional. Reduced-motion preferences must be respected.
- Public, account, and administration screens use the utility foundation consistently.
- Extension and Viewer surfaces share the same tokens while remaining visibly bounded trusted environments.

## Foundation

The initial interface uses a light-first palette:

- warm off-white canvas and white surfaces for ordinary application work;
- dark ink and muted slate for readable hierarchy;
- clear blue as the primary action and brand color;
- deep navy for protected Capsule surfaces;
- restrained mint, cyan, and amber accents for meaningful state;
- subtle borders and shadows instead of heavy decoration.

Instrument Sans is the preferred interface typeface, with system sans-serif fallbacks. Typography should favor direct language, generous spacing, and strong information hierarchy.

The interface must preserve visible keyboard focus, semantic landmarks, usable color contrast, and reduced-motion behavior. WCAG AA is the baseline accessibility target. A full dark application theme is deferred until product workflows justify and validate it.

## Implementation intent

Tailwind CSS 4 is the application styling framework. Shared theme tokens belong in `resources/css/app.css`; views should use those tokens rather than introducing repeated arbitrary colors and shadows.

Reusable page shells belong in `resources/views/layouts`. The initial public shell is `layouts/app.blade.php`. Additional layouts such as guest, authenticated, or Viewer-specific shells should be introduced only when their structure genuinely differs; empty or speculative layouts should not be created.

Pages extend a shared layout and reusable interface elements should become Blade components when repetition appears. Views must not duplicate navigation, footer, metadata, or other application-shell markup.

The public experience should acknowledge that Share Capsules is experimental open-source work sponsored by TekFoundry and provide `info@tekfoundry.com` as the project contact.

## Related documents

- [V1 creator and viewer experience](v1-user-experience.md)
- [Design principles](../01_foundations/principles.md)
- [Open source and sponsorship](../01_foundations/open-source-and-sponsorship.md)
- [Browser Viewer](../06_viewer/browser-viewer.md)
- [V1 threat model](../07_security-and-privacy/threat-model-v1.md)
