---
name: plan-defer
description: Move planned work out of active implementation and into backlog. Use when the user explicitly asks Codex to plan-defer, defer, pause, backlog, or demote an active plan while preserving status, risks, and future activation context.
---

# Plan Defer

Use this skill only for explicit user requests to defer active planned work.
Deferral is not completion and must preserve enough context for later human
activation.

## Workflow

1. Resolve the referenced active plan. Stop if the plan is not under
   `_docs/plans/` or if the user did not explicitly request deferral.
2. Read `AGENTS.md`, `.agents/workflow.md`, `_docs/README.md`, relevant
   design docs, the full active plan, and current worktree status. Read
   completed plans only for relevant historical decisions, regressions, or
   migrations.
3. Confirm deferral is safe: record incomplete tasks, verification gaps,
   unresolved decisions, risks, and any partially implemented work.
4. Update the plan with a deferral note and any reactivation prerequisites.
   Keep the plan aligned with the active workflow `plan.md` template where it
   applies.
5. Move the plan into `_docs/plans/backlog/` without changing its filename
   unless the user requested a rename.
6. Run targeted verification: `git status --short`, `git diff --check` for the
   moved plan, and a search confirming no duplicate active/backlog copy remains.
7. Report the move, preserved context, verification, documentation impact,
   skipped checks, and whether escalation was needed.

## Guardrails

- Do not use deferral to hide failed verification or incomplete implementation;
  record those gaps in the plan.
- Do not archive deferred work under `_docs/plans/completed/`.
- Stop if active code changes need cleanup, revert, or release-risk decisions
  that the user has not explicitly authorized.
