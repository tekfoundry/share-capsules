---
name: task-execute
description: Execute one concrete task from an authorized implementation plan or approved micro-fix. Use when Codex is asked to implement, complete, or continue a task within a plan phase, including selecting the only in-progress plan when no plan is named; honor a user-specified task when provided, otherwise select the best next open task from the current phase. Includes updating task status, making the smallest coherent change, running targeted verification, and reporting evidence; stop when task scope, phase, authorization, or safety-sensitive behavior is unclear.
---

# Task Execute

Use this skill for exactly one smallest implementation unit in the repository
lifecycle. One task should be narrow enough to understand, implement, verify,
and report without losing plan context. The referenced plan, repository
instructions, and current code are authoritative.

Do not use this skill to activate backlog work, complete an entire phase by
default, or broaden the task into adjacent refactors.

## 1. Orient

1. Resolve the plan file using `Active Plan Resolution` in
   `.agents/workflow.md`.
2. Resolve the current phase and task. If the user specifies a task, use that
   task. If the user specifies only a phase, inspect the open tasks in that
   phase and select the best next task based on dependency order, readiness,
   risk, and smallest coherent progress. If the user names neither a phase nor
   a task, infer the current phase as the first phase, in document order, with
   any task marked `⬜️`, `🟨`, or `⚠️`, then select the best next open task in
   that phase. If no phase has open, in-progress, or validation-gap tasks,
   report that the plan has no task to execute.
   Reconciliation, status-update, or "sync with worktree" requests still count
   as one task: select exactly one checklist item, one phase-local status item,
   or one narrowly named reconciliation note. Do not mark multiple plan tasks,
   phases, or verification groups complete in a single `task-execute` turn
   unless the user explicitly identified that exact single aggregate item as the
   task.
3. Read `AGENTS.md`, `.agents/workflow.md`, `_docs/README.md`, the relevant
   design docs, and the containing plan section.
4. Read nearby task status, dependencies, success goals, verification
   requirements, risks, and promotion-to-design guidance from the plan. Use the
   active workflow `plan.md` template as a consistency reference for task and
   execution-note shape when it is available.
5. Inspect the relevant implementation files, tests, and current worktree
   status. Preserve unrelated user changes.

Keep context focused. Read completed plans only for relevant historical
decisions, regressions, or migration evidence.

## 2. Classify and Authorize

Classify the task before editing, and state the selected work mode before
changing files:

- **Active-plan task:** A task in `_docs/plans/` is authorized when the plan is
  active and the requested task belongs to its stated scope.
- **Backlog task:** A task under `_docs/plans/backlog/` is not authorized for
  implementation. Stop and explain that explicit human activation is required.
- **Micro-fix task:** A narrow task may proceed without an active plan only when
  existing design intent covers it and it does not add architecture, schema,
  security, data-safety behavior, or broad workflow changes.

If classification or authorization is uncertain, ask one concise blocking
question. Do not move plans between backlog, active, or completed locations.

## 3. Check Readiness

Proceed only when all are true:

- The task has a concrete expected outcome.
- The task can be completed without inventing material product, architecture,
  security, data-safety, external-system, transfer, delete, overwrite, trust,
  publishing, persistence, or runtime-contract behavior.
- Required design context and implementation patterns are available.
- No relevant worktree conflict or unrelated change would be overwritten.
- Targeted verification can be identified before editing.

If the task is already complete, report the evidence and avoid rewriting it.
If the task expands beyond its phase or plan, stop and report the expansion.
If accurate status reconciliation would require marking multiple independent
tasks or phases complete, update only the selected task and leave the remaining
status changes for later `task-execute`, `phase-execute`, or `plan-execute`
work.

## 4. Implement

For an authorized and ready task:

1. Mark the task in progress using the plan's existing status convention when
   the task belongs to an active plan.
2. Make the smallest coherent change that satisfies the task.
3. Update tests or documentation needed to keep behavior and intent aligned.
4. Preserve existing safeguards around local files, external systems,
   transfers, overwrites, deletes, renames, credentials, trust data,
   publishing, persistence, and runtime contracts.
5. Stop on unexpected failure, ambiguous safety behavior, or scope expansion.

Avoid unrelated cleanup, dependency changes, formatting churn, or broad
refactors unless they are required for the task.

## 5. Verify

Identify and run targeted verification first, then broader checks only as
needed for the changed surface and the plan's requirements. Run broad checks
only after targeted verification passes, or after a targeted-check failure or
blocker has been recorded with residual risk.

Report exact commands and results. If a check cannot run, state the command,
the reason, and the residual risk.

Use the repository's documented checks when applicable, such as tests, type
checks, builds, linting, smoke checks, or packaging/release validation for the
affected subsystem.

## 6. Close the Task

After verification:

- Mark the task complete in the plan when it belongs to an active plan.
- Do not mark sibling tasks, later phase tasks, or whole-plan verification
  items complete merely because evidence for them was observed while orienting.
- Add brief evidence or a completion note when the plan needs it for later
  agents.
- Record remaining risks, skipped checks, or follow-on tasks instead of hiding
  them.
- Keep plan task and evidence updates aligned with the active workflow
  `plan.md` template when it is available.
- Report files changed, verification performed, documentation impact, and
  whether escalation was needed.

A task is not complete merely because files changed. Completion requires the
task outcome, plan expectations, and relevant verification evidence.
