# Viewer Content Profiles

Status: Accepted
Last updated: 2026-06-20

## Purpose

Define an extensible boundary between generic Capsule processing and content-specific validation, creation, and rendering.

## Core direction

The Capsule container is media-agnostic. The trusted Viewer supports content through versioned content-profile implementations registered inside the Viewer.

V1 implements only an image content profile. Future releases may add profiles for plain text, sanitized HTML, PDF, word-processing documents, spreadsheets, audio, video, or other content without placing their format-specific behavior in the generic Capsule parser.

## Trusted implementation boundary

A Capsule identifies the required content-profile identifier and version in its signed manifest. The Viewer resolves that identifier through its local registry of trusted implementations.

Capsules must not contain or download executable profile code. A Host, creator, Capsule, or CTX Provider cannot inject a renderer into the Viewer. Content-profile implementations ship through the trusted Viewer release and review process. If the required profile or version is unavailable, the Viewer fails closed and explains that the content type is unsupported.

## Content-profile responsibilities

Each profile owns content-specific behavior such as:

- Declaring its stable profile identifier, supported versions, and media types
- Validating creator input before packaging
- Deriving safe, signed metadata needed for presentation
- Validating declared media type against actual content bytes
- Enforcing profile-specific file, decoded-size, complexity, and resource limits
- Rendering only inside the extension-controlled Viewer boundary
- Blocking or isolating active content and external resource access
- Handling accessibility semantics appropriate to the content
- Releasing rendered objects, plaintext buffers, and other session resources when the Viewer closes

Generic Capsule code remains responsible for package parsing, manifest canonicalization, signature verification, policy and CTX interaction, content-key handling, payload decryption, and verification of declared lengths and hashes.

Creator tooling should use the same versioned profile implementation, or shared profile validation library, as the Viewer so accepted creator input and Viewer behavior do not drift.

## Shared contract

Capsule Core defines the implemented declaration-validation boundary:

```ts
interface ContentProfile<TDeclaration, TMetadata> {
  readonly id: string;
  readonly version: string;
  readonly mediaTypes: readonly string[];

  validateDeclaration(declaration: TDeclaration): TMetadata;
}
```

The shared declaration implementation returns immutable normalized signed metadata. Browser-specific creator inspection uses a separate interface so Capsule Core remains independent of `File`, `Blob`, DOM, and extension APIs:

```ts
interface CreatorContentProfile<TMetadata> {
  readonly id: string;
  readonly version: string;
  readonly mediaTypes: readonly string[];

  inspect(source: ContentByteSource): Promise<ContentInspection<TMetadata>>;
}

type ContentInspection<TMetadata> =
  | { readonly valid: true; readonly metadata: TMetadata }
  | { readonly valid: false; readonly issues: readonly ContentInspectionIssue[] };
```

The generic Creator Studio retains a source only after its registered profile returns a valid inspection. It also retains the immutable normalized metadata for later manifest assembly, avoiding a second format-specific parse. A boolean is appropriate for small internal signature checks, but the profile boundary returns structured issues so the trusted UI can explain rejection without parsing exceptions or knowing content-specific rules.

### Adding another supported content type

Content profiles are trusted, compile-time extension modules—not executable plugins supplied by a Capsule or website. The code path for adding one is intentionally explicit:

1. Define a stable profile identifier and version plus its accepted media types and compatibility envelope.
2. Implement the shared `ContentProfile` declaration-validation contract in a profile-specific class.
3. Implement the browser-extension `CreatorContentProfile` adapter that inspects actual local bytes and produces only that profile's normalized signed metadata or reviewed validation issues.
4. Implement the browser-extension Viewer adapter that revalidates decrypted bytes, renders them inside the trusted boundary, supplies the profile's accessibility behavior, and disposes every plaintext resource.
5. Register the reviewed implementation in the trusted `TRUSTED_CONTENT_PROFILES` composition root. `ContentProfileRegistry` rejects duplicate identifier/version registrations and unsupported profiles fail closed.
6. Add profile fixtures covering valid, malformed, oversized, active, mismatched, and unsupported content plus creator/Viewer agreement tests.
7. Extend the versioned manifest schema and TypeScript manifest union only through an accepted compatibility change. Format `1.0` is currently the static-image slice; another content type may require a new format version rather than silently broadening an already published contract.

Generic creation and viewing orchestration must depend on the profile interfaces and registry. It must not gain `if image`, `if PDF`, or media-type-specific branches as profiles are added. Profile-specific parsing, limits, rendering, and cleanup stay in that profile's module.

## V1 image profile

V1 ships one image-profile implementation for the reference gallery. It validates supported raster-image signatures, dimensions, decoded complexity, and declared metadata before rendering through an extension-controlled image surface.

The V1 image profile accepts only static:

- JPEG (`image/jpeg`)
- PNG (`image/png`)
- WebP (`image/webp`)

The profile validates the actual file signature and structure rather than trusting a filename extension or declared media type. SVG, GIF, APNG, animated WebP, and other animated or active image forms are unsupported in V1. A file that does not satisfy the static image profile fails closed rather than being passed to a generic browser renderer.

The provisional V1 image-profile compatibility envelope, normatively defined by [Static Image Content Profile V1](../10_specifications/capsule/static-image-profile-v1.md), is:

- Maximum encoded plaintext image size: 25 MiB (`25 * 1024 * 1024` bytes)
- Maximum width: 16,384 pixels
- Maximum height: 16,384 pixels
- Maximum decoded pixel count: 40,000,000 pixels
- Maximum nominal 8-bit RGBA decoded size: 160,000,000 bytes

All limits apply independently; satisfying one does not waive another. The creator validates them before packaging and records signed size, media type, width, height, and pixel-count metadata. The Viewer checks the signed public metadata before requesting a content key when possible, then verifies the actual decrypted bytes, structure, dimensions, and decoded result before rendering. Metadata mismatch or limit violation fails closed.

These values are the minimum intended compatibility promise for the finalized V1 profile, not a universal Capsule limit. Representative Chrome/Chromium desktop benchmarks must confirm stable whole-payload encryption, download, decryption, validation, decoding, rendering, and disposal before release. The limits may be reduced while the profile remains explicitly provisional; after the profile is finalized, support must not be silently reduced except for a documented security response. An incompatible envelope requires a new profile version.

V1 uses one image rendition and downloads the complete Capsule. Future Viewer versions may select locally among creator-approved renditions and retrieve only the selected encrypted entry. See [Adaptive renditions and device capability](../04_capsule/adaptive-renditions.md).

Larger-image support is deferred until creator or viewer demand demonstrates that the V1 envelope blocks an important scenario. That evidence may justify higher whole-payload limits, adaptive renditions, authenticated chunking, or another versioned content profile; V1 does not build those features speculatively.

V1 does not offer a generic “decrypt and download” fallback. Such a fallback would place a persistent plaintext source file outside the Viewer and undermine the intended controlled-viewing boundary.

## Future profiles

Future content profiles require their own threat analysis and rendering rules. In particular:

- Plain text must be rendered as text rather than interpreted as markup.
- HTML requires sanitization, sandboxing, and strict blocking of scripts and external resources.
- PDF requires a maintained local renderer and restrictions on active features and network requests.
- Office-style documents may initially use a locally generated safe rendition rather than execute macros, embedded objects, or native application behavior.
- Audio and video may activate the deferred authenticated-chunking design when streaming or seeking becomes a product requirement.

Adding a content profile does not require redefining CTX policy evaluation or key release, but it may require a new Viewer release and a new profile version.

## Related documents

- [Viewer design intent](design-intent.md)
- [Browser Viewer](browser-viewer.md)
- [Capsule design intent](../04_capsule/design-intent.md)
- [Chunking and large payloads](../04_capsule/chunking-and-large-payloads.md)
- [Adaptive renditions and device capability](../04_capsule/adaptive-renditions.md)
- [Share Capsules reference implementation](../03_architecture/share-capsules-reference-implementation.md)
