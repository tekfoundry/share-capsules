---
name: plan-activate
description: Move a human-authorized backlog plan into active implementation. Use when the user explicitly asks Codex to plan-activate, activate, promote, or start a plan from `_docs/plans/backlog/`; never use to autonomously activate backlog work.
---

# Plan Activate

Activation is a human-controlled boundary. Use this skill only when the user
explicitly asks to activate, promote, or start a backlog plan.

## Workflow

1. Resolve the referenced backlog plan. Stop if the plan is not under
   `_docs/plans/backlog/` or if the user did not explicitly authorize
   activation.
2. Read `AGENTS.md`, `.agents/workflow.md`, `_docs/README.md`, relevant
   design docs, the full backlog plan, and current worktree status. Read
   completed plans only for relevant historical decisions, regressions, or
   migrations.
3. Check readiness: the plan must have clear design intent, phases, tasks,
   success goals, verification expectations, risks, and promotion-to-design
   guidance. Compare it with the active workflow `plan.md` template when that
   template is available, but do not rewrite a ready plan solely for cosmetic
   template differences.
4. Move the plan into `_docs/plans/` without changing its filename unless the
   user requested a rename. Preserve all execution history.
5. Update the plan only as needed to state that human activation occurred and
   to correct stale backlog-only wording.
6. Run targeted verification: `git status --short`, `git diff --check` for the
   moved plan, and a search confirming no duplicate active/backlog copy remains.
7. Report the move, readiness notes, verification, documentation impact,
   skipped checks, and whether escalation was needed.

## Guardrails

- Never activate a backlog plan because it looks ready; explicit human
  direction is required.
- Do not begin implementation in the same step unless the user also requested
  execution and the relevant execution skill is invoked afterward.
- Stop if activation would require unresolved product, architecture, security,
  external-system, transfer, delete, overwrite, trust, publishing, persistence,
  or runtime-contract decisions.
