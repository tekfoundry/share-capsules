# Chunking and Large Payloads

Status: Deferred design
Last updated: 2026-06-19

## Purpose

Explain why V1 uses whole-payload encryption, why authenticated chunking is deferred, and what practical conditions should cause the project to add it.

## Current direction

Capsule is a media-agnostic container, but V1 encrypts its one protected payload as one authenticated-encryption operation and stores the result at `payloads/<payload-id>.enc`.

This does not limit the payload to a particular media type. It does mean that the V1 creator and Viewer must process the complete payload in memory. Each implementation profile therefore declares and enforces a tested payload-size limit appropriate to its runtime.

The manifest should identify the payload encryption representation in a versioned way so a future Capsule format can add a chunked representation without reinterpreting existing Capsules. V1 defines only the whole-payload mode; it must not invent incomplete chunk semantics in anticipation of future use.

## Why chunking is deferred

The primary V1 scenario protects individual images on a static gallery page. These payloads can be encrypted, downloaded, decrypted, and rendered as complete buffers within a deliberately tested size envelope.

The provisional V1 static-image envelope accepts at most 25 MiB encoded plaintext, 16,384 pixels on either side, 40,000,000 decoded pixels, and a nominal 160,000,000-byte RGBA result. See [Viewer content profiles](../06_viewer/content-profiles.md). These are image-profile limits rather than constraints on the media-agnostic Capsule format.

Adding chunking before that scenario requires it would expand the cryptographic and interoperability surface without validating the core Capsule and CTX value proposition. Whole-payload encryption has fewer states, fewer metadata relationships, and a smaller malformed-input and test matrix.

## Benefits of future authenticated chunking

Authenticated chunking can enable:

- Encryption and decryption with a bounded memory footprint
- Large audio, video, document, archive, or dataset payloads
- Playback or processing before the complete payload has downloaded
- Seeking and HTTP range-based retrieval
- Resumable creation, upload, download, or verification
- More useful progress reporting and cancellation
- Recovery from a failed transfer without repeating all work
- Parallel processing where the cryptographic design safely permits it

## Costs and risks

A secure chunked format must define and test substantially more behavior:

- Unique nonce construction or derivation for every chunk
- Authentication binding each chunk to its payload, index, and context
- Detection of missing, duplicated, reordered, substituted, or truncated chunks
- Total chunk count, individual plaintext lengths, and final-chunk rules
- Manifest commitments to the complete ordered payload
- Per-chunk and aggregate integrity behavior
- Partial-download failure and retry behavior
- Streaming ZIP creation and parsing
- Safe memory, concurrency, and backpressure limits
- Random access and range-request semantics
- Cross-implementation test vectors and malformed-input cases

Chunking may reduce peak memory, but it does not automatically improve speed. For small payloads it adds metadata, authentication tags, calls into cryptographic APIs, and implementation overhead.

## When chunking becomes necessary

Chunking should move into active design when at least one supported product scenario requires capabilities that whole-payload processing cannot provide safely or acceptably. Triggers include:

- A supported payload regularly exceeds the tested Viewer memory budget
- The product commits to large audio, video, documents, archives, or datasets
- Playback must begin before the complete payload is downloaded and decrypted
- Seeking or HTTP range retrieval becomes a requirement
- Resumable creation or transfer is needed for expected network conditions
- Whole-payload benchmarks fail defined creation, open-time, stability, or memory targets on supported devices

The decision should be driven by measured product requirements and representative benchmarks, not by the theoretical possibility of large files.

User demand for content outside the accepted V1 image envelope is a valid future product trigger. Until that demand exists, implementation remains focused on the core creation, authorization, key-release, and trusted-rendering path.

## Future design requirements

When activated, the chunked representation must:

- Preserve the existing creator-signature and embedded-policy model
- Remain media-agnostic
- Use established authenticated-encryption constructions
- Make chunk ordering, completeness, and payload identity cryptographically verifiable
- Support deterministic validation across implementations
- Fail closed on unsupported modes or malformed chunk metadata
- Publish test vectors before interoperability is claimed
- Define whether random access is supported without requiring full prior decryption

Chunking may be introduced as an additional payload-encryption mode in a later backward-compatible format revision if existing Viewers can safely reject that mode, or in a new major format version if container semantics must change incompatibly.

## Related documents

- [Capsule design intent](design-intent.md)
- [Share Capsules reference implementation](../03_architecture/share-capsules-reference-implementation.md)
- [Key management](../03_architecture/key-management.md)
- [Access and data flow](../03_architecture/access-and-data-flow.md)
