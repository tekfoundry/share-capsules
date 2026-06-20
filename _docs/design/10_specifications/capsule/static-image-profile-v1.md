# Static Image Content Profile V1

Status: Experimental normative contract with provisional compatibility envelope
Last updated: 2026-06-20

## Scope

This specification defines the V1 static-image profile identity, accepted media types, signed metadata, and provisional resource envelope. It defines the checks available from the signed manifest before key release and the requirements that later plaintext inspection must confirm.

The reference contract and profile implementation are in [`content-profile.ts`](../../../../code/packages/capsule-core/src/content-profile.ts).

## Profile identity

The exact case-sensitive profile identity is:

```text
id:      ctx.content.static-image
version: 1.0
```

A format `1.0` Capsule MUST declare that exact ID and version. A Viewer MUST resolve it only to a trusted implementation installed with the Viewer. A Capsule, Host, creator, CTX Provider, or Key Broker cannot supply executable profile code.

Unknown, differently cased, missing, malformed, older, or future profile identities fail closed. Implementations MUST NOT infer compatibility or silently select another renderer.

## Accepted media types

V1 accepts exactly these case-sensitive media types:

- `image/jpeg`
- `image/png`
- `image/webp`

The signed media type is a declaration, not proof of file structure. Later plaintext inspection MUST verify that actual bytes, structure, dimensions, and animation status agree with the declaration before rendering.

SVG, GIF, APNG, animated WebP, active content, and every undeclared media type are unsupported in V1.

## Signed metadata

The creator-signed manifest supplies:

- `content_profile.id`
- `content_profile.version`
- `payload.media_type`
- `payload.plaintext_size`
- `payload.profile_metadata.width`
- `payload.profile_metadata.height`
- `payload.profile_metadata.pixel_count`

`width`, `height`, and `pixel_count` are positive integer pixel values. The exact relationship is:

```text
pixel_count = width × height
```

The nominal decoded RGBA byte count is derived rather than stored:

```text
nominal_decoded_rgba_bytes = pixel_count × 4
```

Derived metadata returned by the reference profile is immutable and includes the accepted media type, encoded byte length, dimensions, pixel count, and nominal decoded RGBA byte count.

## Provisional V1 envelope

The following limits apply independently:

| Property | Maximum |
|---|---:|
| Encoded plaintext image bytes | 26,214,400 bytes (25 MiB) |
| Width | 16,384 pixels |
| Height | 16,384 pixels |
| Decoded pixel count | 40,000,000 pixels |
| Nominal 8-bit RGBA decoded bytes | 160,000,000 bytes (decimal) |

“160 MB” means exactly 160,000,000 bytes in this profile, not 160 MiB. It is the direct result of the 40,000,000-pixel ceiling multiplied by four RGBA bytes per pixel.

The encoded limit applies to decrypted plaintext image bytes. It does not include the 16-byte AES-GCM tag, manifest, signature, ZIP metadata, or complete Capsule size.

Satisfying one limit does not waive another. A 16,384 × 16,384 declaration fails the pixel and decoded-byte limits even though each dimension independently fits.

## Validation stages

### Creator declaration validation

Before packaging, creator tooling MUST:

1. Select one accepted static image media type.
2. Inspect the actual source sufficiently to determine its encoded size, static structure, width, and height.
3. Reject unsupported, active, or animated content.
4. Enforce every envelope limit.
5. Record the exact signed metadata.

### Viewer preflight

Before authenticated CTX traffic or key release, the Viewer MUST validate the signed profile identity, media type, encoded size, dimensions, pixel-count relationship, pixel limit, and nominal decoded-byte limit. A declaration that already exceeds the envelope fails without consuming a release.

### Viewer plaintext validation

After authorized authenticated decryption and before rendering, the Viewer MUST inspect actual plaintext bytes and confirm the declared media type, static structure, dimensions, pixel count, and resource envelope. Declared-versus-actual mismatch fails closed.

Actual JPEG, PNG, and WebP parsing, animation detection, decoder isolation, rendering, and disposal are not implemented by this Phase 2 contract. They remain required before the V1 Viewer can claim profile support.

## Compatibility and finalization

These values are provisional until representative supported Chrome/Chromium desktop benchmarks demonstrate stable download, whole-payload decryption, structural validation, decoding, rendering, and disposal.

The envelope may be reduced before the profile is declared stable. After stabilization, an incompatible limit or semantic change requires a new profile version except for a documented urgent security response.

The limits belong to this content profile, not the media-agnostic Capsule container. Larger images, adaptive renditions, or chunked payloads require measured product need and a compatible versioned design.

## Executable contract

Automated tests lock down:

- Exact profile identity, version, media types, and every numeric limit
- Immutable normalized signed metadata and derived RGBA bytes
- Acceptance at every exact boundary
- Rejection beyond encoded, dimension, pixel, and decoded-byte limits
- Positive integer and exact `width × height` requirements
- Unsupported media types and profile identities
- Exact trusted-profile resolution without aliases or negotiation
- Alignment between runtime validation and manifest rejection

Reference tests are in [`static-image-profile-v1.test.ts`](../../../../code/packages/test-fixtures/src/capsule/static-image-profile-v1.test.ts).

## Related documents and specifications

- [Viewer Content Profiles](../../06_viewer/content-profiles.md)
- [Capsule Manifest V1](manifest-v1.md)
- [Capsule Payload Encryption V1](payload-encryption-v1.md)
- [Adaptive renditions and device capability](../../04_capsule/adaptive-renditions.md)
