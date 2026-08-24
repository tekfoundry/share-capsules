---
name: plan-execute
description: Orchestrate execution of an active implementation plan across phases. Use when the user asks Codex to execute, continue, or complete an active plan, including selecting the only in-progress plan when no plan is named; repeatedly route bounded phase work through `phase-execute` until completion or a stop condition.
---

# Plan Execute

Use this skill as the parent orchestration context for whole-plan execution.
It sequences phases and owns integration, verification review, documentation
impact, risk tracking, and closeout. It does not bypass `phase-execute` or
`task-execute`.

## Workflow

1. Resolve the active plan using `Active Plan Resolution` in
   `.agents/workflow.md`.
2. Read `AGENTS.md`, `.agents/workflow.md`, `_docs/README.md`, relevant
   design docs, the full active plan, and current worktree status. Read
   completed plans only for relevant historical decisions, regressions, or
   migrations.
3. Classify the work as active-plan execution and state that classification.
4. Review phase order, dependencies, success goals, verification, risks, and
   promotion-to-design requirements. Use the active workflow `plan.md`
   template as a consistency reference for plan sections and status vocabulary
   when it is available.
5. For each open phase, invoke or follow `phase-execute` on that bounded phase.
   After each phase, review plan status, verification evidence, documentation
   impact, risks, and worktree state before continuing.
6. Stop on unclear product or design decisions, missing backlog activation
   authorization, failed or blocked verification, task, phase, or plan scope
   expansion, underspecified safety-sensitive behavior, relevant worktree
   conflicts or unrelated user changes, context that is too large to reason
   about confidently, or unexpected failure.
7. When all phases are complete, run or request `plan-complete` for verification
   review, design promotion, risk closeout, and archiving.
8. Report phases completed, files changed, verification, documentation impact,
   skipped checks, remaining risks, and whether escalation was needed.

## Guardrails

- Never activate backlog work or archive a plan from this skill without the
  matching lifecycle skill and explicit user request.
- Keep the parent context responsible for sequencing and integration even when
  bounded phase or task work is delegated.
- Preserve authoritative plan state in the parent context. Delegated work must
  return files changed, verification performed, remaining risks, documentation
  impact, and scope-expansion status before the parent continues.
- Delegate bounded phase or task work only when context size, risk, or
  parallelism justifies a fresh context and the delegated scope is independent
  enough to review cleanly.
- Preserve local file safety, external-system safety, credentials, trust data,
  publishing, persistence, and runtime-contract safeguards.
