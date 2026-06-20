# Agent Workflow

This document defines the default workflow for an AI coding agent operating in this repository. It is the repo-specific operating contract.

## Operating Principles

- Correctness over cleverness. Prefer boring, readable solutions that are easy to maintain.
- Smallest change that works. Minimize blast radius and avoid opportunistic refactors.
- Read before write. Find the existing implementation, pattern, and design context before editing.
- Prove it works. Do not mark work complete without verification or a clear statement of what could not be verified.
- Be explicit about uncertainty. If something is inferred or unverified, say so.
- Keep docs and code aligned. If implementation changes intended behavior, update the relevant docs as part of the work.
- Build the smallest end-state-compatible slice. MVP scope may be narrow, but foundational choices should preserve the intended ecosystem and ownership model.

## End-State-Aligned Decision Process

Share Capsules V1 is a proof of concept and MVP inside a larger intended Capsule and CTX ecosystem. “MVP” means limiting breadth and operational scale; it does not automatically justify a temporary architecture that must be replaced to support known goals.

Use the following process for consequential product, protocol, architecture, security, privacy, storage, identity, and interoperability decisions.

### 1. Restate the current need and intended destination

- Define the concrete V1 capability being enabled.
- Identify the known long-term properties that constrain it, such as creator ownership, portable Capsules, multiple CTX Providers, creator-selected brokers, privacy, backward compatibility, and independent implementations.
- Separate known destination requirements from speculative possibilities.

### 2. Classify the decision

- **Foundational:** Shapes a persisted format, protocol message, public API, identity or key model, trust boundary, security guarantee, or interoperability contract.
- **Replaceable implementation detail:** Can be exchanged behind a stable boundary without changing user data, protocol participants, security semantics, or public behavior.

Foundational decisions require explicit end-state analysis. Replaceable details may favor the simplest reliable V1 implementation when the boundary and migration path are real rather than aspirational.

### 3. Compare credible alternatives

For each serious option, evaluate:

- V1 implementation and operational cost
- Security and privacy properties
- Creator-ownership impact
- Coupling to Share Capsules or another single provider
- Compatibility with the intended open ecosystem
- Backward-compatibility and migration requirements
- Persisted-data or cryptographic rework
- Testability, failure modes, and maintainability
- Which complexity is required now versus merely possible

Do not recommend an option only because it is fastest for V1. Do not add future machinery only because it might someday be useful.

### 4. Choose the smallest end-state-compatible slice

Prefer the option that preserves the known target architecture while deferring breadth that V1 does not exercise.

Examples of appropriate deferral include supporting one configured provider behind an open provider interface, one named cryptographic suite behind explicit versioning, or one content profile behind a stable profile registry. The foundational shape is implemented now; federation breadth, additional suites, and additional profiles wait.

A V1 shortcut is acceptable when at least one of these is true:

- It is fully hidden behind a stable boundary and can be replaced without changing protocol or persisted user artifacts.
- Its migration is understood, deliberately low-cost, and documented.
- Measurements show that the end-state mechanism is not yet pragmatically necessary, and the current version can safely reject unsupported future behavior.

### 5. State deferrals and activation triggers

When functionality is deferred, document:

- What V1 does
- What the future design is intended to enable
- Why the additional complexity is not yet justified
- The measurable product, performance, security, or interoperability conditions that should reactivate the work
- How versioning or interfaces prevent ambiguity in the meantime

### 6. Record the accepted decision immediately

- Update the relevant `_docs/design` documents after the decision is accepted.
- Keep only the current design intent; remove stale open questions or superseded direction.
- Use an ADR when the rationale and consequences of a consequential architectural commitment need to remain independently discoverable.
- Ensure later plans treat the accepted decision as an input rather than reopening it accidentally.

### Recommendation format

Before asking for acceptance of a consequential recommendation, communicate:

1. The recommended V1 choice.
2. Why it is necessary now.
3. How it aligns with the intended ecosystem.
4. Complexity deliberately deferred.
5. Rework or migration risk.

If a user preference reveals a missing long-term constraint, re-run the analysis rather than defending the earlier recommendation.

## Documentation Model

### `_docs/design`

- This directory holds stable design intent for the application.
- Documents in this directory should describe the desired current state of the system.
- Stable design docs should reflect the latest accepted iteration of the codebase.

### `_docs/plans`

- This directory is the working space for in-progress and future changes.
- Every non-trivial effort starts with a plan document in this directory unless an existing active plan already covers the work.
- Plan documents may describe future state, transitional architecture, phased rollout, risks, and open decisions.
- Plan documents may also contain lessons and implementation feedback gathered while executing the work.
- Completed plan documents will eventually be deleted, so design intent should be promoted to `_docs/design` and lessons harvested for this document.

### Relationship Between `design`, `plans`, and workflow guidance

- Code is the implemented behavior.
- `_docs/design` is the stable design truth for the intended current system.
- `_docs/plans` is the temporary and evolving design space for active work.
- This document captures reusable workflow guidance learned across efforts.
- When plan work is completed, durable design intent must be moved into `_docs/design`, and useful lessons should be harvested to improve this document.

## Plan Mode Default

- Plan mode is the default starting point for non-trivial work.
- The first output of plan mode is a new or updated document in `_docs/plans`.
- The plan document is the source of truth for the effort while work is in progress.
- If new information changes the intended approach, update the plan document before continuing implementation.
- Do not leave substantial design decisions only in chat or only in code.
- If a bug fix or validation issue is discovered while working an active plan, capture that work in the existing plan instead of creating a separate standalone plan.

### When Plan Mode Applies

- Multi-file changes.
- Architectural or schema changes.
- New features or major behavior changes.
- Production-impacting fixes.
- Work that will take multiple implementation phases.

### When Plan Mode Can Be Skipped

- Very small, isolated fixes with no meaningful design impact.
- Mechanical edits with obvious scope and negligible risk.

## Plan Document Requirements

Each plan document in `_docs/plans` should include, at minimum, the following sections:

### 1. Context

- What problem is being solved.
- What repo or product context was reviewed.
- Any assumptions or constraints that materially shape the work.

### 2. Design Intent

- The intended end state for the change.
- The key behaviors, interfaces, boundaries, and invariants that should exist when the work is complete.
- Any design decisions that should later become part of stable design documentation.

### 3. Implementation Phases

- Organize the work into ordered phases.
- Each phase should have a clear objective.
- Each phase should contain concrete tasks.
- Each phase should define success goals so completion can be judged explicitly.
- Include verification expectations where relevant.

### Task Status Tracking

- Use `⬜️` for not started tasks.
- Use `🟨` for tasks that are currently in progress.
- Use `✅` for completed tasks.
- Apply these markers directly in phased task lists so plan progress is visible at a glance.
- Keep task status current as work progresses so the plan document remains an accurate execution record.

### 4. Open Questions, Risks, or Follow-On Work

- Capture unresolved decisions, rollout concerns, dependencies, and known tradeoffs.

### 5. Lessons

- Capture implementation feedback, mistakes, surprises, and process improvements discovered during the work.
- Record only lessons that are reusable or likely to matter again.
- Use this section to gather material that may later improve this document.
- Bug-fix lessons discovered while executing an active plan should stay in that plan unless they are general enough to change this workflow.

## Implementation Workflow

### 1. Review Existing Context

- Read the relevant code, tests, and documentation before editing.
- Check `_docs/design` for current intended behavior.
- Check `_docs/plans` for active or related implementation work.
- If code, design docs, and plan docs disagree, identify the drift explicitly and resolve it deliberately.

### 2. Create or Update the Plan

- Create a new plan document for the change, or extend an existing active plan if the work clearly belongs there.
- Define the design intent and implementation phases before coding.
- Prefer phased delivery that reduces risk and makes verification straightforward.
- Do not create a separate bug-fix plan for issues found while validating or completing an already active implementation plan.
- Create a standalone plan only when the work is independent of the current active plans.

### 3. Implement in Small Slices

- Follow existing project conventions before introducing new abstractions.
- Prefer thin, verifiable increments over broad changes.
- Fix the problem at the right layer rather than patching symptoms.
- Keep related docs updated when implementation materially changes the intended design.

### 4. Verify Before Declaring Completion

- Run the relevant tests, lint, typecheck, build, or deterministic manual repro.
- Compare baseline behavior against changed behavior when relevant.
- When schema changes affect runtime queries, align the local database schema before treating build or page-generation results as authoritative.
- If verification cannot be run, say what was not verified and how it should be checked.

### 5. Complete the Plan

- Confirm that the phase success goals were met.
- Update the plan document to reflect what was completed, what changed, and any remaining risks or follow-on work.
- Make sure the plan captures durable lessons worth preserving.

## Plan Completion and Design Promotion

When work covered by a plan document is complete:

1. Verify that the implementation matches the intended outcome.
2. Move durable design intent into a new or existing document in `_docs/design`.
3. Remove ambiguity about what is still future work versus what is now stable design.
4. Review the plan's `Lessons` section.
5. Harvest reusable workflow improvements from those lessons into this document.
6. Move the completed plan document into `_docs/plans/completed/`.
7. Rename the completed plan file to prefix it with the completion date using `YYYY-MM-DD-<original-name>.md`.

The goal is that completed plans should not remain the only place where final design truth lives.

### Completed Plan Archiving

- Completed plans should not remain mixed with active work in `_docs/plans`.
- Archive completed plans under `_docs/plans/completed/`.
- Prefix archived plan filenames with the completion date.
- Use the format `YYYY-MM-DD-<current-name>.md`.
- The date prefix should reflect when the plan was completed, not when it was first created.

### Archive Readiness Checklist

Before archiving a plan, confirm all of the following:

- All plan tasks are marked as completed.
- Stable design intent from the plan has been distributed into the appropriate files under `_docs/design`.
- The `_docs/design` structure has been reviewed for any refactors or reorganization needed to keep the docs clear and easy to navigate.
- Any new design docs are referenced from related docs where appropriate and can ultimately be discovered from `_docs/design/README.md`.
- Relevant test coverage is in a good state, with the goal of keeping the test suite green.
- The plan no longer contains active implementation work, unresolved execution tasks, or validation follow-up that should remain in `_docs/plans`.

## Communication Expectations

### During Work

- Provide concise progress updates when starting, when scope changes, when risks appear, or when verification fails.
- Do not narrate every minor step.
- Surface important assumptions and blockers clearly.

### Final Delivery

- Lead with outcome and impact.
- Reference concrete artifacts such as file paths, commands, or failing checks.
- Summarize verification performed.
- If something was not verified, state that directly.
- Call out doc updates when code or design intent changed.

## Error Handling and Recovery

- If unexpected failures appear, stop adding scope and return to diagnosis.
- Preserve evidence such as errors, logs, or repro steps.
- Reproduce, localize, reduce, fix root cause, add coverage where appropriate, and verify the original report.
- Prefer safe defaults and actionable failures over partial or silent behavior.

## Coding and Design Rules

- Prefer explicit names and straightforward control flow.
- Avoid adding dependencies unless the existing stack cannot solve the problem cleanly.
- Keep error semantics consistent within a code path.
- Validate untrusted input at boundaries.
- Avoid type suppressions unless there is no reasonable alternative.
- For UI work, preserve accessibility, predictable interactions, and clear states.

## Git and Worktree Safety

- Treat a dirty worktree as normal and inspect before editing.
- Never revert unrelated changes you did not make unless explicitly asked.
- Do not overwrite user changes without understanding them.
- Avoid destructive git operations unless explicitly requested.
- Keep changes atomic and easy to review.

## Definition of Done

A task is done when:

- The implementation matches the accepted design intent.
- Relevant verification has been run, or any gaps are explicitly documented.
- The active plan document reflects the final state of the work.
- Durable design knowledge has been promoted into `_docs/design` when the work is complete.
- Reusable lessons have been considered for inclusion in this document.

## Plan Template

Use this shape for new documents in `_docs/plans`:

### Title

Brief name for the effort.

### Context

- Problem statement
- Existing context reviewed
- Constraints and assumptions

### Design Intent

- Intended end state
- Key decisions
- Boundaries and invariants

### Implementation Phases

#### Phase 1: Name

- Objective
- Tasks
  - `⬜️` Not started task
  - `🟨` In progress task
  - `✅` Completed task
- Success goals
- Verification

#### Phase 2: Name

- Objective
- Tasks
  - `⬜️` Not started task
  - `🟨` In progress task
  - `✅` Completed task
- Success goals
- Verification

### Open Questions / Risks

- Outstanding decisions
- Rollout or migration concerns

### Lessons

- Reusable implementation or workflow learnings

### Promotion to Design

- Which `_docs/design` documents need to be created or updated when the work is complete
