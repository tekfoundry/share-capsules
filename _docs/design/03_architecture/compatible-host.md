# Compatible Host Contract

Status: Draft
Last updated: 2026-06-19

## Purpose

Define the minimum V1 HTTP behavior required to publish Capsule files without making the Host an account, CTX, key-release, or plaintext service.

## Host role

A compatible Host serves ordinary HTML, public fallback assets, and opaque `.capsule` files over HTTPS. It does not authenticate Capsule viewers, evaluate creator policy, receive trust evidence, redeem authorization tickets, possess content keys, or render plaintext.

The Host may be a static website, object store, CDN, personal server, content platform, or any future system satisfying this contract.

## Required V1 behavior

### HTTPS

The Host page and Capsule file must use HTTPS. V1 rejects plaintext HTTP Capsule sources and redirect downgrades.

### Retrieval

The Capsule URL supports an ordinary unauthenticated `GET`. `HEAD` support is strongly recommended so the Viewer can inspect length and representation metadata before downloading.

When `Content-Length` is present, the Viewer rejects a response exceeding its content-profile envelope before reading the body. When length is unavailable, the Viewer reads through a bounded path and aborts as soon as the configured encoded-size limit is exceeded.

### Media type

Until Capsule has a stable registered media type, V1 Hosts may serve Capsule files as:

- `application/octet-stream`
- `application/zip`

The Viewer treats the header as a transport hint only. It validates ZIP structure, the signed manifest, entry hashes, versions, suite, and content profile before authorization or decryption.

A future registered Capsule media type may become preferred without making these V1 representations invalid.

### CORS

Capsule responses expose public cross-origin read access, normally:

```http
Access-Control-Allow-Origin: *
```

Capsules are intentionally distributable encrypted artifacts. Public CORS does not authorize decryption or reveal viewer identity. The V1 extension still obtains Host permission, while CORS preserves compatibility with future approved web-based tooling and Viewers.

Credentialed CORS is not required. Hosts do not need viewer cookies or Share Capsules credentials.

### Immutable revision URLs

A published URL identifies one immutable Capsule revision. Creators publish changed content or policy at a new URL rather than replacing bytes behind an existing revision URL.

Hosts may use long-lived public caching for immutable Capsule URLs and may provide `ETag` or `Last-Modified` validators. Caches store only the encrypted Capsule and public metadata.

### Redirects

The Viewer may follow a bounded number of HTTPS redirects. It revalidates every target and requires viewer permission for the final Capsule origin when that origin differs from the approved Host page.

Redirects containing credentials, downgrading to HTTP, or escaping Viewer URL-safety policy are rejected.

## Not required in V1

A compatible V1 Host does not need:

- Account registration or login
- CTX Provider or Trust Provider logic
- Key Broker integration
- Dynamic application code
- Viewer-specific responses
- Cookies or credentialed requests
- Database storage
- HTTP range-request support
- Knowledge that a key was released or content rendered

Range requests may become required by a future adaptive-rendition or chunked-streaming profile. They are explicitly not part of the V1 Host conformance boundary.

## Declarative page integration

The Host page identifies a Capsule and supplies accessible fallback content:

```html
<capsule-viewer src="/capsules/artwork-01.capsule">
  <img src="/previews/artwork-01.jpg" alt="Protected artwork preview">
  <a href="https://sharecapsules.com/open?capsule=...">
    Open protected artwork
  </a>
</capsule-viewer>
```

The page does not need a Share Capsules JavaScript SDK. The approved extension discovers the element in an isolated content script and inserts the trusted rendering frame.

## Viewer validation

HTTP success does not establish Capsule validity. Before policy evaluation or key release, the Viewer independently enforces:

- URL and redirect policy
- HTTP status and bounded response size
- ZIP entry and resource limits
- Signed manifest and detached creator signature
- Declared entry sizes and hashes
- Capsule, policy, suite, and content-profile compatibility

## Related documents

- [End-to-end Capsule access and data flow](access-and-data-flow.md)
- [Share Capsules reference implementation](share-capsules-reference-implementation.md)
- [Capsule design intent](../04_capsule/design-intent.md)
- [Browser Viewer](../06_viewer/browser-viewer.md)
- [Adaptive renditions and device capability](../04_capsule/adaptive-renditions.md)
