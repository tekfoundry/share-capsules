# Agent Engineering Best Practices

## Purpose
Define reusable coding and design practices for AI-agent work in product
repositories.

This document guides day-to-day implementation and code review decisions. Use
repo-specific entrypoints, design docs, and active plans for product-specific
architecture, commands, and safety boundaries.

## Core Principles

### 1. Maintainability First
- Prefer code that is easy to read, test, and change over clever implementations.
- Optimize for long-term ownership, not just short-term speed.
- Keep behavior explicit and avoid hidden side effects.

### 2. Clear Ownership Boundaries
- Keep presentation concerns separate from runtime, transport, persistence, and
  infrastructure concerns.
- Keep bridge or adapter layers focused on narrow typed contracts.
- Keep dispatch, routing, and registration thin; move behavior into focused
  services or domain modules.
- Keep shared contracts and shared helpers in shared packages only when the
  ownership is real.

### 3. SOLID-Oriented Design
- `S`: one module or service should have one reason to change.
- `O`: add behavior through extension or composition where practical.
- `L`: interfaces should behave consistently across implementations.
- `I`: prefer small focused interfaces over broad multi-purpose ones.
- `D`: depend on abstractions and contracts, not UI components reaching into runtime specifics.

### 4. YAGNI
- Do not build speculative abstractions before there is a concrete need.
- Use the simplest structure that supports the current product behavior.
- Reserve future application or package boundaries without filling them
  prematurely.

### 5. DRY
- Centralize shared business rules, validation, and error mapping.
- Avoid duplicating client/runtime or boundary contract shapes.
- Refactor repeated patterns once they are proven, not before.

## Current Architectural Practices

### UI and Runtime Boundaries
- Keep UI rendering, feature state, and view behavior separate from runtime,
  filesystem, network, or persistence concerns.
- Route runtime actions through the repository's established boundary helpers
  instead of scattered low-level calls.
- Keep components presentational when possible and move workflow logic into
  feature modules, hooks, services, or equivalent local patterns.

### Bridges and Contracts
- Treat bridge or API layers as the only consumer-facing runtime surface.
- Keep runtime bridges small, typed, explicit, and stable.
- Update shared contracts whenever runtime-facing contract shapes change.

### Services and Ownership
- Keep app bootstrap, registration, and wiring small.
- Put filesystem, network, terminal, transfer, persistence, and other runtime
  behavior into focused services.
- Prefer one clear owner per live session, channel, resource, or workflow.

## File and Module Size Guidance
- Avoid all-in-one files that mix UI, state, transport, and persistence.
- Prefer small focused files with one primary concern.
- Split a file when it contains multiple responsibilities, becomes hard to navigate, or resists isolated testing.
- Use the module topology checkpoints below before adding more behavior to an
  area that is already growing.
- Treat size as a review signal, not a style preference. A production file over
  250 lines needs a quick responsibility audit during review. A new production
  file over 300 lines needs a written reason to stay together. A production file
  over 500 lines is a stop-and-refactor signal unless it is generated, a schema
  table, or a parser/fixture file with a narrow purpose.

## New File Design Check
- Before creating a brand-new implementation file, identify the file's primary
  role in one sentence.
- A new file should usually be one of:
  - a narrow entrypoint, route, command, handler, adapter, or component
  - a focused domain or service module with one clear reason to change
  - a small facade that delegates to focused implementation modules
  - a shared utility whose callers and ownership are clear
- If the file's purpose cannot be described without "and", "plus", or a list
  of unrelated responsibilities, split the design before committing the first
  version.
- Match the repository's existing module topology. If similar domains use
  folders, layered modules, facades, adapters, or service boundaries, new code
  should follow that shape from the first implementation unless there is a
  documented reason not to.
- Do not postpone obvious separation just because the file is new. When the
  responsibilities are already known, prefer the intended maintainable shape in
  the first implementation slice.
- Split a new file before committing when it combines three or more of these
  responsibility types:
  - user interaction, rendering, or output formatting
  - workflow orchestration
  - domain rules or business decisions
  - validation, parsing, or normalization
  - persistence, configuration, or state mutation
  - filesystem, network, database, or external-system I/O
  - security, authorization, trust, or safety checks
  - error mapping or user-facing diagnostics
  - test fixtures, mocks, or environment setup

## Module Topology Checkpoints
- Review module organization before adding more behavior to an area that is
  already growing.
- Pause and consider a small structural refactor when one file or module has
  more than one clear reason to change.
- Pause when orchestration, domain rules, I/O, presentation, persistence, or
  integration concerns are mixed together.
- Pause when a local helper is becoming a shared subsystem.
- Pause when related files are accumulating without a naming or folder pattern
  that reveals ownership.
- Pause when generated, compiled, packaged, or published artifacts mirror source
  layout and have become hard to navigate.
- Pause when tests need broad setup because responsibilities are not isolated.
- Prefer extracting around stable roles that already exist in the code. Do not
  invent structure for speculative future behavior, but do create a clear home
  for repeated roles once they appear.

## Review and refactor gate

Before marking a `Review & Refactor` task complete, perform a maintainability
scan and record the result in the plan or final handoff.

1. Run a file-size scan for source and test files. Prefer:

   ```bash
   rg --files src tests | xargs wc -l | sort -nr | head -25
   ```

   If `rg` is unavailable, use:

   ```bash
   find src tests -type f | xargs wc -l | sort -nr | head -25
   ```

2. For every new or heavily changed production file over 250 lines, write down
   its responsibilities in plain language.
3. If the file has three or more responsibility types from the New File Design
   Check, refactor it before closing the task or record a follow-up plan with
   the risk and reason for deferral.
4. Check for duplicated helpers or rules introduced during the phase. Extract
   them only when there is a clear owner and at least two real callers.
5. Do not mark `Review & Refactor` complete while a correctness risk or obvious
   mixed-responsibility production file remains unplanned.

## Shared Utility Decisions
- Before writing reusable utilities for interaction, formatting, parsing,
  tables, diffing, logging, scheduling, validation, protocol handling, or other
  common infrastructure concerns, check whether a mature platform API,
  framework feature, or library already solves the problem.
- Prefer a project-owned wrapper when the dependency affects many callers,
  testability, user-facing behavior, or future replacement cost.

## Error Handling
- Handle low-level errors close to the source.
- Map them into user-facing categories at the application boundary.
- Never swallow runtime failures silently.
- Include enough detail for debugging without exposing secrets.

## State Management
- Keep state scoped to the feature that owns it.
- Separate transient UI state from domain state.
- Avoid duplicate sources of truth.
- Model long-running workflow transitions explicitly.

## Testing
- Write code that is testable by design.
- Prefer unit tests for pure logic, state transitions, and error mapping.
- Use component and bridge-boundary tests for UI/runtime or client/server
  interaction.
- Keep real-server validation manual and opt-in.
- Add tests when fixing regressions.

## Security and Safety
- Never log passwords, passphrases, or raw secret tokens.
- Keep destructive operations explicit and confirmed.
- Treat trust, identity, and authorization checks as first-class workflows.
- Do not add or broaden secret persistence without explicit product approval and
  matching documentation updates.

## Performance and Responsiveness
- Keep UI responsive during network and filesystem operations.
- Avoid blocking user interactions with heavy work.
- Preserve explicit progress updates for long-running operations.
- Use guardrails for very large or risky editor/file workflows.

## Code Review Expectations
- Review for correctness first, then maintainability, then style.
- Push back on blurred ownership boundaries.
- Ask for extraction when a file or service starts owning too many concerns.
- For every brand-new file, review whether its responsibility, name, and
  location fit the surrounding architecture. Treat a large new file with mixed
  concerns as a design issue, not just a cleanup opportunity.
- Require tests or a documented reason when changing non-trivial logic.

## Refactoring Guidance
- Refactor in small safe steps.
- Preserve behavior while improving structure.
- Add characterization tests before risky refactors.
- Remove dead code once replacements are validated.

## Practical Do / Don't

### Do
- keep UI, bridge/API, and runtime/service responsibilities distinct
- use typed contracts for runtime boundaries where the stack supports them
- centralize validation and error mapping
- keep session and channel ownership explicit
- update stable docs when architecture decisions change

### Don't
- hide complex runtime side effects inside UI components or other presentation code
- duplicate contract shapes across client and runtime code
- add speculative abstractions for unbuilt product areas
- leave migration-only compatibility logic in the active runtime without a strong reason
- let stale docs become the source of truth

## Definition of Maintainable
Code is maintainable when:
- a new engineer can find the right module quickly
- file responsibilities are clear
- UI/runtime or client/server boundaries are obvious
- runtime contracts are understandable
- core workflows are covered by the right level of testing
- feature changes can be made without rewriting unrelated systems
