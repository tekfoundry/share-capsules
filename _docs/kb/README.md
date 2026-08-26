# Share Capsules Knowledge Base

Status: Current-state knowledge base
Last updated: 2026-08-26

This knowledge base is the durable source for implemented Share Capsules
behavior. The legacy design tree remains available as a review baseline during
the migration, but new guidance should point here.

Plans can guide inspection, but implementation evidence owns current-state
truth. Completed plans are historical records unless a current KB page links to
them as evidence.

## Reading Order

1. [Product overview](01-product/product-overview.md)
2. [V1 requirements](02-requirements/v1-requirements.md)
3. [System architecture](03-architecture/system-architecture.md)
4. [V1 contracts and specifications](03-architecture/v1-contracts-and-specifications.md)
5. [Security and privacy model](04-security/security-and-privacy.md)
6. [Verification strategy](05-quality/verification-strategy.md)
7. [Operations runbook](06-operations/operations-runbook.md)
8. [Decision records](07-decisions/README.md)
9. [Glossary](glossary.md)
10. [Legacy design migration inventory](migration-inventory.md)

## Directory Map

- [01-product](01-product/README.md): product positioning, user workflows,
  UX principles, and user-facing acceptance signals.
- [02-requirements](02-requirements/README.md): actors, use cases,
  constraints, non-goals, and acceptance criteria.
- [03-architecture](03-architecture/README.md): subsystem boundaries,
  runtime contracts, data flow, module maps, and protocol specifications.
- [04-security](04-security/README.md): threat model, trust boundaries,
  secrets posture, privacy, local-file safety, and auditability.
- [05-quality](05-quality/README.md): test levels, verification matrices,
  release checks, regression risk, and validation gaps.
- [06-operations](06-operations/README.md): local/runtime topology, build,
  release, rollback, smoke checks, monitoring, and incident validation.
- [07-decisions](07-decisions/README.md): accepted decisions and tradeoffs.
- [Glossary](glossary.md): shared project language.

## Migration Note

The old design tree has not been deleted. It should remain intact until the
developer reviews this migration and explicitly approves deletion.
