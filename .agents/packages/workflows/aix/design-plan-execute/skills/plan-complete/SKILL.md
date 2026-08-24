---
name: plan-complete
description: Close an implementation plan only after tasks, verification, design promotion, risks, and documentation impact are resolved or explicitly recorded. Use when a user asks to complete or archive a plan.
---

# Plan Complete

Use this skill for plan closeout. Do not archive a plan merely because files
changed or most tasks are marked complete.

## Workflow

1. Resolve the plan explicitly, or infer it only when exactly one active plan
   exists. Fail clearly when multiple candidates exist.
2. Confirm every task and success goal, including documented validation gaps.
3. Run or review required targeted and repository verification.
4. Promote durable accepted behavior using `$design-promote`.
5. Review documentation structure, formatting, links, and current-state
   accuracy using `$documentation-review`.
6. Harvest reusable lessons and update workflow guidance when appropriate.
7. Record final risks, follow-on work, documentation impact, and verification.
   Keep the completed record consistent with the active workflow `plan.md`
   template where it applies.
8. Archive only completed plans under `_docs/plans/completed/` with the
   required `YYYY-MM-DD-<name>.md` filename.

When the plan contains `## Completion Checklist`, update it during closeout.
The checklist is visible planning guidance, not the sole source of truth. Still
enforce this skill's workflow and guardrails if the section is missing or was
edited locally.

## Guardrails

- Never archive a backlog plan or activate one implicitly.
- Refuse closeout when incomplete work or undocumented verification gaps remain.
- Preserve unrelated worktree changes.
- Keep the archived plan as historical execution evidence, not the sole source
  of current design truth.
