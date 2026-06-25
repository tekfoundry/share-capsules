# Official Network and Service Registry

Status: Accepted
Last updated: 2026-06-24

## Purpose

Define how Share Capsules balances an open Capsule/CTX protocol with the practical need for official creator and Viewer tools to recognize only trustworthy CTX Providers and Key Brokers by default.

## Design intent

Capsule and CTX are open technologies. A compatible implementation may build its own creator tooling, Viewer, CTX Provider, Key Broker, and service registry without requiring Share Capsules to approve the whole ecosystem.

Share Capsules also operates an opinionated official network. The official creator and Viewer tools use a curated registry of recognized CTX Providers and Key Brokers. This registry is a product and security boundary for the Share Capsules network, not a claim of authority over every possible Capsule or CTX implementation.

Protocol compatibility and official recognition are separate:

- **Protocol compatibility** means a service can implement the public Capsule, CTX, ticket, discovery, and key-release contracts.
- **Official recognition** means the Share Capsules official tools are willing to let creators select that service and let Viewers send credentials, device proofs, tickets, or key-release requests to it.
- **Ecosystem recognition** means another Viewer or community may choose a different registry or trust list.

V1 recognizes only the Share Capsules CTX Provider and Share Capsules Key Broker. The manifest and protocol already carry provider and broker identities so this narrow starting point does not require replacing Capsule artifacts when additional services are later recognized.

## Registry responsibilities

The Share Capsules registry should describe recognized services and their current status. It is expected to include:

- CTX Provider service identities
- Key Broker service identities
- Supported protocol versions and profiles
- Discovery metadata locations or pinned issuer relationships
- Public signing-key and key-rotation expectations
- Operational status such as recognized, deprecated, suspended, revoked, test-only, or lower-assurance
- Human-readable service names, operators, support contacts, and policy links where appropriate
- Capability declarations needed by creator tooling and Viewer UX

The registry must be signed, authenticated, freshness-bounded, and cached fail-safely by official tools. A stale or unverifiable registry must not cause the Viewer to silently trust unknown services.

## Creation behavior

Official creator tooling presents recognized providers and brokers from the registry. A creator can choose among services that the official network recognizes for the relevant Capsule format, content profile, policy type, and key-release profile.

When the creator completes a Capsule, the selected CTX Provider issuer, broker identity, release handle, and policy digest are written into the signed Capsule manifest. The Host cannot later change these bindings without invalidating the Capsule signature.

Revoking or suspending a service in the registry prevents future official creation with that service. Existing Capsules are not rewritten because their signed manifests are immutable.

## Viewer behavior

Official Viewers consult the registry before sending credentials, device proofs, authorization requests, tickets, or key-release requests to a Capsule's declared provider or broker.

For unknown, revoked, incompatible, or suspended services, the default official Viewer behavior is fail closed. Lower-assurance or test-only services may be available only through explicit development or advanced configuration, and must be visibly distinguished from the default trusted network.

This registry check affects existing Capsules as well as newly created Capsules. An already-created Capsule continues to name the provider and broker originally signed into it, but an official Viewer may refuse to interact with those services after recognition is removed.

Share Capsules can revoke only its own official recognition. If an independent provider, broker, and Viewer ecosystem continues operating outside the Share Capsules registry, Share Capsules cannot prevent those tools from opening Capsules that they recognize.

## Revocation semantics

Registry revocation is recognition revocation, not internet takedown.

Revocation can:

- Prevent future official Creator tool selection
- Prevent official Viewers from authorizing or redeeming through the service
- Warn users about deprecated or lower-assurance services
- Protect official-network viewers from compromised, malicious, or non-compliant services

Revocation cannot:

- Change signed manifests in already-created Capsules
- Force an independent provider or broker offline
- Prevent an independent Viewer from choosing a different trust list
- Prove that all historical key releases were invalid or malicious

For severe compromise, official Viewers should refuse by default. For planned deprecation, the registry may allow a transition period with user-facing warnings and a creation cutoff.

## Governance direction

The initial registry may be operated by Share Capsules/TekFoundry because V1 has only one recognized provider and broker. The design should still avoid treating the registry as the protocol's permanent central authority.

Future governance may include:

- Public recognition criteria
- Signed transparency logs for additions, removals, and key changes
- Multiple registries or trust lists
- Community, enterprise, or publisher-specific registries
- Independent security review and compliance attestations
- Appeal and incident-response processes for revoked services

The official network should be honest about its scope: it controls the quality bar for official Share Capsules tools, not all compatible Capsule and CTX software.

## Open questions

- What minimum technical and operational criteria are required before a third-party provider or broker can be recognized?
- Should official tools ever expose an advanced override for unknown services, or should recognition be mandatory in all non-development builds?
- Which registry statuses require hard failure versus warnings?
- What transparency mechanism is sufficient before third-party services are recognized?
- How should existing Capsules be surfaced when their provider or broker is deprecated but not revoked?

## Related documents

- [ADR-0001: Open Protocol and Opinionated Official Network](../08_decisions/ADR-0001-open-protocol-official-network.md)
- [System overview](system-overview.md)
- [Share Capsules reference implementation](share-capsules-reference-implementation.md)
- [End-to-end Capsule access and data flow](access-and-data-flow.md)
- [CTX authorization and key release](../05_ctx/authorization-and-key-release.md)
- [CTX trust model](../05_ctx/trust-model.md)
- [V1 threat model](../07_security-and-privacy/threat-model-v1.md)
