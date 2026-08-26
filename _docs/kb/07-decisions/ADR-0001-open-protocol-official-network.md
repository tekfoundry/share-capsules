# ADR-0001: Open Protocol And Opinionated Official Network

Status: Accepted
Date: 2026-06-24
Migrated: 2026-08-26

## Context

Capsule and CTX are intended to support portable encrypted artifacts,
independent implementations, creator-selected providers, and future
provider/broker diversity. V1 starts with the Share Capsules implementation:
one official creator tool, one official Viewer, one CTX Provider, and one Key
Broker.

Blindly accepting arbitrary provider or broker URLs would let malicious
services receive viewer credentials or device proofs, misrepresent policy
decisions, mishandle key release, or degrade privacy. Treating Share Capsules
as permanently required by the protocol would turn an open protocol into a
closed platform.

## Decision

Share Capsules uses an open protocol, opinionated official network model.

Capsule and CTX specifications remain open and implementable. Independent
groups may build creator tools, Viewers, providers, brokers, and registries.

Official Share Capsules tools recognize only services that appear in the Share
Capsules service registry or equivalent configured trust list. In V1, that
recognized set contains only the Share Capsules CTX Provider and Share Capsules
Key Broker.

The registry governs official recognition, not universal protocol validity. A
service can be protocol-compatible without being recognized by the official
Share Capsules network.

## Rationale

This preserves the long-term ecosystem goal without pushing V1 into premature
federation. The signed Capsule manifest already carries CTX issuer and broker
identities, so artifact shape supports future services while official tools can
start with one known service pair.

Separating compatibility from recognition gives the official Viewer a clear
safety rule: do not send OAuth credentials, device proofs, authorization
requests, tickets, or key-release requests to unknown or revoked services by
default.

## Consequences

- Official tools must check provider and broker recognition during creation and
  viewing.
- Recognition revocation prevents official future interaction without rewriting
  existing Capsules or disabling independent ecosystems.
- Product language must avoid implying Share Capsules controls the whole
  protocol.
- Third-party service recognition criteria remain a future governance task.

## Alternatives Considered

- **Permanent Share Capsules-only protocol:** simpler V1, but incompatible with
  the open ecosystem goal.
- **Arbitrary provider and broker URLs in official tools:** maximally open, but
  unsafe by default.
- **Browser or extension-store identity as sole trust root:** useful for Viewer
  distribution but insufficient for deciding which providers and brokers to
  trust.
- **Fully decentralized recognition from the start:** potentially valuable
  later, but premature before third-party services exist.

## Related Documents

- [System architecture](../03-architecture/system-architecture.md)
- [V1 requirements](../02-requirements/v1-requirements.md)
- [Security and privacy](../04-security/security-and-privacy.md)
- [Product overview](../01-product/product-overview.md)
