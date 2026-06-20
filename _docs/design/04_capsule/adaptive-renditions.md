# Adaptive Renditions and Device Capability

Status: Deferred design
Last updated: 2026-06-19

## Purpose

Define the V1 boundary for image delivery and capture the future intent for choosing an appropriate protected rendition without downloading every rendition in a Capsule.

## Problem

Viewer devices differ in screen size, pixel density, memory, processing speed, and network conditions. The ordinary web addresses this by publishing several image sizes and selecting one before downloading the full-resolution asset.

A simple Capsule implementation downloads one complete encrypted package before the Viewer can inspect or decrypt its payload. Packaging multiple renditions in that file would not improve bandwidth or initial memory use if the Viewer still had to download the entire file before choosing one.

This is a limitation of the V1 retrieval profile, not a fundamental limitation of creator-controlled encryption or the Capsule model.

## V1 direction

V1 uses:

- One protected image rendition per Capsule
- One complete `.capsule` download per open
- Whole-payload authenticated encryption
- One V1 image content profile for static JPEG, PNG, and WebP
- A provisional compatibility envelope of 25 MiB encoded plaintext, 16,384 pixels per side, 40,000,000 decoded pixels, and a nominal 160,000,000-byte RGBA result, finalized only after representative supported-device benchmarks

The compatibility envelope will define encoded-file, decoded-pixel, dimension, peak-memory, creation-time, and open-time expectations. These values should be selected from measurements rather than one development machine or an arbitrary protocol-wide ceiling.

The Capsule format remains media-agnostic and does not acquire a universal content-size limit. The V1 image profile rejects content outside its tested envelope. A Viewer that cannot safely process an otherwise conforming image should fail before requesting key release where available metadata permits, explain the device limitation, and avoid counting a view.

Adaptive renditions remain deferred until real creator or viewer demand shows that a single conforming rendition is insufficient. V1 does not add rendition selection, derivation, or partial retrieval merely to anticipate that possibility.

V1 does not generate multiple responsive renditions, select among encrypted alternatives, or require HTTP range support from Hosts.

## Future adaptive-rendition intent

A future Capsule version or content profile may contain multiple creator-approved renditions of the same logical content. Each rendition would have signed metadata describing properties relevant to local selection, such as:

- Media type
- Encoded byte length
- Pixel dimensions or other media-specific characteristics
- Cryptographic hash
- Encrypted entry location
- Content-profile compatibility
- Key or key-release identifier

The Viewer would choose a rendition locally using display characteristics, supported formats, device capability, accessibility needs, and user preference. The Host must not choose the protected rendition or receive the viewer's Share Capsules account information.

## Selective retrieval

Adaptive renditions are useful only if the Viewer can retrieve the manifest and selected encrypted entry without downloading all other renditions.

For a future ZIP-based Capsule, the intended flow is:

1. Fetch the ZIP directory and the bounded entries needed to obtain the manifest and detached signature using HTTP range requests.
2. Verify the creator signature and rendition metadata.
3. Select one compatible rendition locally.
4. Explain policy and obtain viewer consent.
5. Request authorization and the content key for the selected rendition.
6. Range-fetch only that encrypted rendition.
7. Verify, decrypt, and render it locally.

The exact archive layout, range sequence, manifest-discovery mechanism, and key-release messages remain future specification work. They must not assume that an arbitrary ZIP can be trusted before its signed manifest is verified.

## Security and privacy constraints

A future adaptive design must:

- Keep all rendition metadata and hashes inside the creator-signed manifest
- Prevent a Host from substituting an unsigned lower- or higher-quality rendition
- Give each protected rendition appropriate independent encryption material
- Bind authorization and key release to the Capsule and selected rendition
- Count one successful open when the selected rendition's key is released, not one view per range request
- Reject malformed ranges, overlapping entries, duplicate paths, decompression tricks, and size mismatches
- Define behavior when a Host ignores or does not support range requests
- Avoid disclosing device capability or a global viewer identifier to the Host
- Explain that requested byte ranges may still let a Host infer which rendition was selected

## Relationship to chunking

Adaptive renditions and authenticated chunking solve different problems:

- **Adaptive renditions** choose one complete creator-provided representation appropriate to a device.
- **Chunking** divides one representation for bounded-memory processing, streaming, seeking, or resumable transfer.

Multiple renditions do not require chunking when each selected rendition can be processed as a complete payload. A future video profile may need both rendition selection and chunking.

## When to activate this work

Adaptive renditions should move into active design when representative measurements or product use show that one V1 rendition causes unacceptable bandwidth, memory use, open time, or visual quality across supported devices.

It should not be added merely because responsive-image techniques exist on the public web. The added Host requirements, archive behavior, key relationships, policy binding, and interoperability tests must be justified by observed need.

## Related documents

- [Capsule design intent](design-intent.md)
- [Chunking and large payloads](chunking-and-large-payloads.md)
- [Viewer content profiles](../06_viewer/content-profiles.md)
- [Share Capsules reference implementation](../03_architecture/share-capsules-reference-implementation.md)
- [Access and data flow](../03_architecture/access-and-data-flow.md)
