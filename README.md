# Share Capsules

Share Capsules is the first reference implementation of two experimental open technologies:

- **Capsule** — a portable, creator-signed package containing encrypted content, signed metadata, and creator-selected access policy.
- **Capsule Trust Exchange (CTX)** — a protocol for evaluating that policy and authorizing a trusted Viewer to receive a content key.

The goal is to help creators distribute work publicly while reducing unauthorized automated harvesting. Capsule and CTX cannot prevent screenshots, external recording, modified clients, or misuse by an authorized viewer. They are experimental and should not yet be relied upon to protect highly sensitive material.

## Current status

The project is implementing its initial proof of concept and MVP. The current supported scenario will allow a creator to:

1. Package one static JPEG, PNG, or WebP image locally as a `.capsule` file.
2. Host that encrypted file on an ordinary static HTTPS site.
3. Embed it with a `<capsule-viewer>` element and public fallback content.
4. Require a viewer to satisfy the Capsule's signed CTX policy before local decryption and rendering by the browser extension.

The [design documentation](_docs/design/README.md) describes the intended architecture, security and privacy boundaries, threat model, and experimental specifications. The [initial MVP plan](_docs/plans/initial-mvp.md) tracks implementation progress.

## Open ecosystem

Capsule and CTX are intended to support public review, compatible independent implementations, multiple CTX Providers, and creator-selected Key Brokers. `sharecapsules.com` is TekFoundry's reference implementation; it is not intended to be the only permitted provider.

The protocols remain experimental. An implementation should not claim interoperability or conformance until the relevant versioned specifications and fixtures define that claim.

## Local development

Requirements:

- Docker Desktop with Docker Compose
- Git

From the repository root:

```bash
./_infra/kit doctor
./_infra/kit up
./_infra/kit artisan migrate
./_infra/kit check
```

Default local endpoints:

- Laravel: <http://localhost:3003>
- Vite: <http://localhost:5174>
- Mailpit: <http://localhost:8026>

Composer, npm, Artisan, builds, and tests run inside the pinned app container through `_infra/kit`. See the [infrastructure guide](_infra/README.md) for commands and topology.

## Sponsorship and contact

Capsule, CTX, and Share Capsules are sponsored and initially maintained by [TekFoundry](https://tekfoundry.com).

Public review, compatible implementations, and constructive contributions are welcome. General questions, proposals, and comments may be sent to [info@tekfoundry.com](mailto:info@tekfoundry.com).

Please do not report suspected vulnerabilities through public issues. Follow the [security policy](SECURITY.md).

## License

Licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for attribution. The license does not grant rights to TekFoundry or Share Capsules names, logos, domains, or other marks beyond nominative use required to describe compatibility.
