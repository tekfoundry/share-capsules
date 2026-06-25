# ADR-0001: Open Protocol and Opinionated Official Network

Status: Accepted
Date: 2026-06-24

## Context

Capsule and CTX are intended to support portable encrypted artifacts, independent implementations, creator-selected providers, and future provider/broker diversity. V1 starts with only the Share Capsules implementation: one official creator tool, one official Viewer, one CTX Provider, and one Key Broker.

If official tools blindly accept arbitrary provider or broker URLs, a malicious service could receive viewer credentials or device proofs, misrepresent policy decisions, mishandle key release, or degrade privacy. If Share Capsules instead treats its own provider and broker as permanently required by the protocol, the project becomes a closed platform despite using open specifications.

The project therefore needs a distinction between open protocol compatibility and the official network's trust decisions.

## Decision

Share Capsules will use an **open protocol, opinionated official network** model.

Capsule and CTX specifications remain open and implementable. Independent groups may build their own creator tools, Viewers, providers, brokers, and registries.

The official Share Capsules creator and Viewer tools will recognize only services that appear in the Share Capsules service registry or equivalent configured trust list. In V1, that recognized set contains only the Share Capsules CTX Provider and Share Capsules Key Broker.

The registry governs official recognition, not universal protocol validity. A service can be protocol-compatible without being recognized by the official Share Capsules network.

## Rationale

This preserves the long-term ecosystem goal without pushing V1 into premature federation. The signed Capsule manifest already carries CTX issuer and broker identities, so the artifact shape supports future services while official tools can start with one known service pair.

Separating compatibility from recognition also gives the official Viewer a clear safety rule: do not send OAuth credentials, device proofs, authorization requests, tickets, or key-release requests to unknown or revoked services by default.

Creators still get a coherent product experience. They choose from recognized providers and brokers rather than entering arbitrary security-critical URLs. Later, when more services exist, the same UX can expose capabilities, status, and warnings from the registry.

## Consequences

The official network needs a registry concept before third-party services are exposed in production tooling.

Official tools must check provider and broker recognition during both creation and viewing. Creation checks prevent new Capsules from being wired to unrecognized or revoked services. Viewer checks protect existing and future Capsules by refusing to interact with services that the official network no longer recognizes.

Revocation does not rewrite existing Capsules or force independent services offline. It removes official recognition. Independent ecosystems may continue using their own trust lists and tools.

Public product language must avoid implying that Share Capsules controls the entire protocol. It controls its official network and reference implementation.

## Alternatives considered

### Permanent Share Capsules-only protocol

This would simplify V1, but it would contradict the intended open ecosystem and make provider/broker diversity require a later protocol reset.

### Arbitrary provider and broker URLs in official tools

This maximizes openness but creates an unsafe default. Viewers could be tricked into sending security-sensitive requests to unreviewed services.

### Browser or extension-store identity as the only trust root

This helps identify official Viewers, but it does not answer which CTX Providers or Key Brokers those Viewers should trust.

### Fully decentralized recognition from the start

Multiple registries, transparency logs, and cross-ecosystem governance may become valuable, but V1 has no third-party services to evaluate. The accepted approach keeps the data model compatible while deferring governance breadth.

## Related documents

- [Official network and service registry](../03_architecture/official-network-and-registry.md)
- [System overview](../03_architecture/system-overview.md)
- [Share Capsules reference implementation](../03_architecture/share-capsules-reference-implementation.md)
- [CTX trust model](../05_ctx/trust-model.md)
- [Open source and sponsorship](../01_foundations/open-source-and-sponsorship.md)
