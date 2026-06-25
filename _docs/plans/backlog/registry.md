# Provider and Broker Registry Backlog

Status: Backlog
Last updated: 2026-06-24

## Context

Share Capsules has accepted an open protocol, opinionated official network model. The protocol should remain implementable by independent ecosystems, while the official creator and Viewer tools rely on a curated registry before they trust CTX Providers or Key Brokers.

Reviewed context:

- `_docs/agent-workflow.md`
- `_docs/design/03_architecture/official-network-and-registry.md`
- `_docs/design/08_decisions/ADR-0001-open-protocol-official-network.md`
- `_docs/design/03_architecture/system-overview.md`
- `_docs/design/03_architecture/access-and-data-flow.md`
- `_docs/design/05_ctx/authorization-and-key-release.md`
- `_docs/design/07_security-and-privacy/threat-model-v1.md`

Assumptions and constraints:

- V1 recognizes only the Share Capsules CTX Provider and Share Capsules Key Broker.
- The Capsule manifest already carries provider and broker identities; the registry should not require a manifest shape change for V1.
- Registry recognition is an official-network trust decision, not universal protocol authority.
- Official Viewer behavior must fail closed for unknown, revoked, or unverifiable services.
- Implementation should preserve a path to future signed registries, transparency, and third-party recognition without building full federation immediately.

## Design Intent

The official Share Capsules tools should have a single service-recognition layer that answers:

- Is this CTX Provider recognized for this environment and protocol version?
- Is this Key Broker recognized for this environment and key-release profile?
- What is the current service status?
- Which combinations of provider, broker, content profile, policy profile, and cryptographic suite are allowed?
- What should creator and Viewer UX show for recognized, deprecated, suspended, revoked, test-only, or lower-assurance services?

The V1 implementation can use a local/static registry seeded from configuration, but it should expose the same domain concepts expected from a later signed remote registry. Creation and viewing should both consult this recognition layer rather than scattering provider/broker allowlists through unrelated code.

Key invariants:

- Unknown services fail closed in official non-development builds.
- Revoked services cannot be selected during official Capsule creation.
- Official Viewers do not send OAuth tokens, DPoP proofs, CTX authorization requests, tickets, device proofs, or broker redemption requests to unrecognized or revoked services.
- Registry status does not mutate signed existing Capsules; it changes whether official tools interact with the services named by those Capsules.
- Development/test-only services are clearly separated from production recognition.

## Implementation Phases

### Phase 1: Domain Model and Local Registry

Objective: Introduce service recognition as an explicit domain concept without changing runtime behavior beyond centralizing the existing single-service allowlist.

Tasks:

- ⬜️ Define provider and broker registry record shapes, statuses, capability fields, and environment scoping.
- ⬜️ Add configuration entries for the V1 Share Capsules CTX Provider and Key Broker as recognized production/local services.
- ⬜️ Implement a registry reader/service that validates closed-shape records and exposes provider/broker lookup APIs.
- ⬜️ Add unit tests for recognized, unknown, malformed, deprecated, suspended, revoked, and test-only records.

Success goals:

- Existing V1 Share Capsules flows still recognize only the configured Share Capsules provider and broker.
- Unknown services have one central failure path.
- Tests prove status handling and environment separation.

### Phase 2: Creator Tool Enforcement

Objective: Prevent official creation from selecting unrecognized or revoked providers/brokers.

Tasks:

- ⬜️ Route Creator Studio and extension creation configuration through the registry layer.
- ⬜️ Replace hard-coded provider/broker assumptions in creation with recognized registry records.
- ⬜️ Add user-facing creation failure states for unsupported, revoked, suspended, or test-only services.
- ⬜️ Add tests proving the signed manifest uses only registry-recognized provider and broker identities in official creation.

Success goals:

- Official creation cannot produce a production Capsule wired to an unknown or revoked service.
- Local development remains possible through explicit local/test registry records.

### Phase 3: Viewer Enforcement

Objective: Ensure official Viewers consult recognition before network disclosure to CTX Providers or Key Brokers.

Tasks:

- ⬜️ Check provider recognition after Capsule verification and before OAuth connection or CTX authorization.
- ⬜️ Check broker recognition before broker redemption.
- ⬜️ Add distinct Viewer states for unknown, revoked, suspended, deprecated, and lower-assurance services.
- ⬜️ Add tests proving no credentials, proofs, tickets, or key-release requests are sent to unrecognized services.

Success goals:

- Viewer network disclosure fails closed for unrecognized or revoked services.
- Existing Capsules naming Share Capsules services continue to open through the current V1 flow.

### Phase 4: Registry Distribution and Freshness

Objective: Move from static configuration toward an authenticated registry update path suitable for third-party services.

Tasks:

- ⬜️ Define a signed registry document format and canonicalization rules.
- ⬜️ Define registry signing-key storage, rotation, expiration, and cache freshness rules.
- ⬜️ Implement fetch, verification, caching, and fallback behavior for official tools.
- ⬜️ Add tests for stale registries, invalid signatures, rollback attempts, key rotation, and offline behavior.

Success goals:

- Official tools can consume a signed registry without trusting unauthenticated network responses.
- Stale or unverifiable registry data does not silently broaden trust.

### Phase 5: Operations, Governance, and UX

Objective: Make recognition changes operable, auditable, and understandable.

Tasks:

- ⬜️ Define recognition criteria for CTX Providers and Key Brokers.
- ⬜️ Define operational runbooks for deprecation, suspension, emergency revocation, and recovery.
- ⬜️ Add audit trails for registry changes and service status transitions.
- ⬜️ Design creator and Viewer copy for registry-driven warnings and failures.
- ⬜️ Evaluate whether public transparency logs are required before third-party production recognition.

Success goals:

- A service can be added, deprecated, suspended, or revoked with a documented process.
- Users receive clear explanations without exposing sensitive internal risk details.

## Open Questions, Risks, or Follow-On Work

- What recognition status should allow opening existing Capsules with warnings rather than hard failure?
- Should production official tools ever allow an advanced override for unknown providers or brokers?
- How should provider/broker pair compatibility be expressed when a provider trusts only certain brokers or vice versa?
- What minimum audit, privacy, and incident-response commitments are required from third-party services?
- How should independent registries be represented if enterprise or community trust lists become a product requirement?
- A registry outage must not become an availability cliff for already-cached recognized services, but stale caches must not preserve revoked trust indefinitely.

## Lessons

- None yet.
