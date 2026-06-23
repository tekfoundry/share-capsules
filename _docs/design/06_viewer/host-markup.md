# Viewer Host Markup

Status: Draft
Last updated: 2026-06-23

## Purpose

Define the intended authoring syntax for placing Capsules on ordinary Host pages without giving the Host page access to decrypted content.

## Design intent

Host markup should feel like normal HTML. A creator or site developer should be able to use their existing page structure, CSS classes, and inline layout styles around protected content. Share Capsules should not require a separate design system just to make a Capsule fit into a page.

The security boundary remains strict: the Host owns surrounding layout, but the extension owns decrypted rendering. The Host must not receive decrypted bytes, content keys, object URLs, authorization tickets, account identifiers, device proofs, or detailed trust results.

## Target syntax

The preferred target syntax is:

```html
<capsule-viewer src="/capsules/eclipse-photo.capsule">
  <fallback>
    <article class="rounded-2xl bg-white p-6 shadow-sm">
      <h2>Protected photo</h2>
      <p>Install or enable the Share Capsules Viewer to open this Capsule.</p>
    </article>
  </fallback>

  <template>
    <article class="rounded-2xl bg-white p-6 shadow-sm">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>

      <content
        class="mt-4 h-80 w-full rounded-xl object-cover"
        style="background: #f8fafc;"
      ></content>
    </article>
  </template>

  <error>
    <article class="rounded-2xl border border-red-200 bg-red-50 p-6">
      <h2>Capsule unavailable</h2>
      <p>{{ error_message }}</p>
    </article>
  </error>
</capsule-viewer>
```

The custom top-level children are:

- `<fallback>` — public Host content shown when the extension is unavailable, not yet active, or before the Viewer has enough information to present the opened template.
- `<template>` — the Host-owned opened layout. The extension activates this template after verifying public Capsule metadata.
- `<error>` — optional Host-owned error layout for safe failure messages.

Inside `<template>`, `<content>` marks the protected viewing surface. The extension replaces only that element with an extension-origin iframe. Surrounding elements remain in the Host page and continue using the Host page's CSS.

## Metadata placeholders

The Viewer may replace reviewed placeholders in Host-owned template text after verifying the Capsule manifest:

- `{{ title }}`
- `{{ description }}`
- `{{ error_message }}` inside `<error>`

These values are inserted as text, never as HTML. Capsule metadata is public and signed, but it is still treated as untrusted input for DOM purposes.

## Styling model

Classes and inline styles on ordinary surrounding elements stay in the Host page and work normally with the Host's existing CSS.

Classes and inline styles on `<content>` are copied to the iframe shell that replaces it. This lets the Host control placement, dimensions, rounded corners, shadows, margins, and responsive layout without reaching into the decrypted content document.

The Host page's CSS does not cross into the extension iframe. The current implementation accepts `fit="contain|cover|fill|full-height|scale-down"` on `<capsule-viewer>` and translates that into reviewed internal media behavior. `full-height` makes image height fill the viewing surface, keeps the image centered, and allows horizontal overflow when the natural image width is wider than the available area. Arbitrary Host stylesheets are not imported into the trusted frame.

## Error behavior

If `<error>` is present, the extension uses it for safe user-facing failure states. The Viewer supplies only reviewed generic messages. It must not expose raw protocol detail, stack traces, tokens, proofs, tickets, keys, account identifiers, recovery material, or broker internals to Host DOM.

If `<error>` is missing, the extension presents a default error state inside the protected viewing surface.

## Missing elements

The minimal accepted markup remains:

```html
<capsule-viewer src="/capsules/eclipse-photo.capsule"></capsule-viewer>
```

If `<fallback>` is missing, the Host has no custom no-extension content. The extension or public instructions may provide a default install/opening message.

If `<template>` is missing, the extension may create a default Host layout containing one protected viewing surface.

If `<content>` is missing inside `<template>`, the extension appends a protected viewing surface at the end of the template and emits a safe debug warning when debug mode is enabled.

If multiple `<content>` elements are present, the extension uses the first one and ignores the rest.

## Boundaries

The Host may:

- choose the Capsule URL;
- provide public fallback, opened, and error layout;
- style the surrounding page and iframe shell;
- remove, hide, resize, or cover the iframe.

The Host may not:

- read the iframe DOM;
- read decrypted media, object URLs, or plaintext;
- receive key-release material or authorization tickets;
- run executable renderer code inside the Viewer;
- import arbitrary Host CSS into the extension frame.

## Current implementation note

The active Phase 7 implementation supports direct `<capsule-viewer src="...">` discovery, public fallback preservation, hidden extension-origin iframe startup, structured `<template>` activation after successful opening, `<content>` iframe placement, safe text substitution, optional `<error>` presentation for failure states, `fit`, `viewer-height`, and debug diagnostics.

The iframe remains hidden during routine fetch, verification, authorization, key release, and decrypt work so a normal page refresh does not briefly flash Viewer chrome. The Host fallback remains visible until the Viewer needs user action, reports a safe error, or has protected content ready to display.

## Related documents

- [Browser Viewer](browser-viewer.md)
- [Viewer fallback and assurance](fallback-and-assurance.md)
- [Compatible Host contract](../03_architecture/compatible-host.md)
