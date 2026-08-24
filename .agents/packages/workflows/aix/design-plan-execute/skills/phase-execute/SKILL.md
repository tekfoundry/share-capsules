---
name: phase-execute
description: Orchestrate execution of one active-plan phase through bounded `task-execute` work. Use when a user asks to review, complete, or implement a phase in a plan file, including selecting the current phase when no phase is named; repeatedly route concrete tasks through `task-execute` until the phase is complete or a stop condition occurs.
---

# Phase Execute

Use this skill for explicit requests such as:

- "Review phase 3 in @file:plan.md. If there is enough information, do the work; otherwise ask questions."
- "Run phase-execute on @file:plan.md."
- "Continue the current phase in @file:plan.md."

The referenced plan, repository instructions, and current code are authoritative. Do not treat this skill as permission to broaden scope or activate future work.

Use this skill as the parent orchestration context for a single active-plan
phase. It sequences task work, owns phase-level integration, reviews
verification evidence and documentation impact after each task, tracks risks,
and does not bypass `task-execute`.

## 1. Orient

1. Resolve the plan file using `Active Plan Resolution` in
   `.agents/workflow.md`.
2. Resolve the phase:
   - If the user names a phase, use that phase.
   - If the user names no phase, select the current phase.
   - The current phase is the first phase, in document order, with any task
     marked `⬜️`, `🟨`, or `⚠️`.
   - Skip phases where every task is marked `✅`.
   - If no phase has open, in-progress, or validation-gap tasks, report that
     the plan has no current phase to execute.
   - If task markers are missing or mixed with stale checkbox syntax, stop and
     repair the plan only when the intended task state is clear. Otherwise ask
     a concise question.
3. Read `AGENTS.md`, `.agents/workflow.md`, and `_docs/README.md`.
4. Use the documentation router to select and read only the relevant `_docs/design` files.
5. Read the full referenced plan section, including context, design intent, risks, verification, and promotion-to-design requirements.
   Use the active workflow `plan.md` template as a consistency reference for
   phase, task, execution-note, verification, risk, and promotion sections when
   it is available.
6. Inspect related active or backlog plans, implementation files, tests, and current worktree status. Do not overwrite unrelated user changes.

Load only context relevant to the phase. Read completed plans only for relevant historical decisions or regressions.

## 2. Classify

Determine the work mode before editing, and state the selected work mode before
changing files:

- **Active-plan work:** A plan in the active plans directory is authorized for implementation.
- **Backlog work:** A plan under a backlog directory is planned but not authorized. Stop and explain that explicit human activation is required. Do not move, edit, or implement it.
- **Micro-fix:** A localized change may proceed without a plan only when existing design intent covers it and it does not add architecture, schema, security, data-safety behavior, or a broad workflow.

If classification is uncertain, ask a clarifying question rather than guessing.

## 3. Assess Readiness

Proceed only when all of these are true:

- The user has authorized the identified work mode.
- The phase has a concrete objective, tasks, success criteria, and verification expectations.
- Existing code and design intent provide enough detail to implement without inventing material product or architecture decisions.
- No unresolved question affects data safety, credentials, persistence, publishing, runtime boundaries, or other high-risk contracts.

Ask concise, decision-focused questions for any missing or conflicting information. Do not ask questions that repository inspection can answer. If the phase is already complete, report that with evidence instead of redoing it.

## 4. Execute

For an authorized and ready phase:

1. State the selected phase and why it was selected, especially when the phase
   was inferred as the current phase.
2. Review the phase task order, dependencies, success goals, verification
   expectations, risks, and promotion-to-design requirements.
3. For each open task in the phase, invoke or follow `task-execute` for that
   bounded task. Prefer the next dependency-ready task and avoid combining
   unrelated tasks into one implementation slice.
4. After each task, review plan status, verification evidence, documentation
   impact, risks, and worktree state before continuing to the next task.
5. Keep plan, code, tests, and stable design documentation aligned as behavior changes.
6. Treat local file operations, external systems, transfers, overwrites, deletes, renames, credentials, trust data, publishing, and persistence as high risk. Preserve existing safeguards and verify related failure paths together.
7. Delegate bounded task work only when context size, risk, or parallelism
   justifies a fresh context and the delegated scope can return clear evidence
   for parent review.
8. Stop and return to diagnosis on unclear product or design decisions, missing
   backlog activation authorization, failed or blocked verification, task or
   phase scope expansion, underspecified safety-sensitive behavior, relevant
   worktree conflicts or unrelated user changes, context that is too large to
   reason about confidently, or unexpected failure.

Do not introduce unrelated refactors, dependencies, or process changes merely because they are convenient.

## 5. Verify

Identify and run targeted checks for the changed behavior first, then the
repository-required checks that apply. Run broad checks only after targeted
verification passes, or after a targeted-check failure or blocker has been
recorded with residual risk. Use the repository's documented default checks
when applicable, such as tests, type checks, builds, linting, smoke checks, or
packaging/release validation for the affected surface.

If a check cannot run, state the exact command and reason. A phase is not complete while required verification gaps remain undocumented.

## 6. Close

After all phase tasks are complete and verified:

- Confirm all phase tasks, success goals, and verification expectations are
  complete or have explicitly recorded validation gaps.
- Mark completed tasks and record any remaining risks or follow-on work in the plan.
- Promote durable current-state behavior into the appropriate design documentation.
- Consider whether a reusable lesson belongs in workflow guidance or lessons learned.
- Archive the plan only when the repository workflow explicitly requires it and all completion conditions are met.
- Report the outcome, files changed, verification run, documentation impact, and any unresolved gaps.

Never claim completion based only on changed files; completion requires the phase success criteria and relevant verification.
