---
name: plan-review
description: Review an implementation plan for scope, authorization, design completeness, risks, and verification readiness without implementing it. Use when a user asks to review or assess a plan.
---

# Plan Review

Review the referenced plan as an execution contract without changing code or
activating backlog work.

## Workflow

1. Resolve the plan and read its context, design intent, phases, risks,
   verification, and promotion requirements.
   Compare the plan against the active workflow `plan.md` template when that
   template is available, but do not treat local template customization as a
   defect by itself.
2. Read the repository instructions, documentation router, relevant design
   docs, related active or backlog plans, and current worktree state. Read
   completed plans only when specific historical decisions, regressions, or
   migrations are relevant to the review.
3. Check work classification and whether the requested phase is authorized.
4. Report findings in priority order: missing decisions, conflicting sources
   of truth, unsafe assumptions, weak success criteria, and verification gaps.
5. State whether the plan is ready for execution and identify the exact
   blocking questions when it is not.

## Guardrails

- A backlog plan may be reviewed and refined, but never activated by review.
- Do not load completed plans as default context or treat them as current-state
  truth without a historical reason to consult them.
- Do not claim readiness when a material data-safety, credential,
  external-system, publishing, persistence, runtime-boundary, or contract
  decision remains unresolved.
