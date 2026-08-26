---
name: plan-update
description: Update an active or backlog implementation plan without executing it. Use when Codex is asked to revise plan scope, task status, risks, verification, lessons, or promotion guidance while preserving backlog/active/completed lifecycle boundaries.
---

# Plan Update

Use this skill for plan maintenance only. Do not implement code, activate
backlog work, or archive completed work from this skill.

## Role Collaboration

`plan-update` owns the plan edit. Roles can supply bounded specialist
judgment, but they do not own lifecycle state, accepted decisions, task
execution, verification results, or final user-facing reporting.

When `.agents/roles/product-strategist.md` exists and the requested update
changes product scope, audience, user value, prioritization, sequencing,
opportunity cost, or product fit, use `delegate-to-role` or a prompt-overlay
delegation to request bounded product-strategy input.

When `.agents/roles/product-designer.md` exists and the requested update
changes user flows, interaction states, accessibility expectations, layout
hierarchy, terminal UX, prompts, product-facing states, recovery paths, or
design-system constraints, use `delegate-to-role` or a prompt-overlay
delegation to request bounded product-design input.

When `.agents/roles/requirements-engineer.md` exists and the requested update
changes requirements, actors, workflows, inputs, outputs, constraints,
non-goals, boundaries, acceptance signals, open decisions, Design Intent
readiness, or implementation-phase constraints, use `delegate-to-role` or a
prompt-overlay delegation to request bounded requirements input.

When `.agents/roles/technical-architect.md` exists and the requested update
changes system boundaries, component contracts, module ownership, runtime
contracts, integration choices, data flow, persistence, package-management
behavior, workflow lifecycle behavior, phase order, task boundaries, or
maintainability tradeoffs, use `delegate-to-role` or a prompt-overlay
delegation to request bounded architecture input.

When `.agents/roles/security-engineer.md` exists and the requested update
changes trust boundaries, secrets, authentication, authorization, permissions,
dependency or supply-chain risk, local file writes, overwrites, deletes,
renames, external systems, network access, package trust, source resolution,
lockfile integrity, no-write guarantees, Security Review expectations, or
other safety-sensitive behavior, use `delegate-to-role` or a prompt-overlay
delegation to request bounded security input.

When `.agents/roles/ux-writer.md` exists and the requested update changes
user-facing or developer-facing text requirements, labels, prompts, command
help, terminal output, errors, empty states, onboarding copy, README language,
workflow instructions, release notes, terminology, or docs copy that tells
users what to do, use `delegate-to-role` or a prompt-overlay delegation to
request bounded UX writing input.

When `.agents/roles/quality-engineer.md` exists and the requested update
changes verification expectations, acceptance checks, regression-risk notes,
manual validation, skipped-check rationale, evidence expectations, validation
gaps, residual risk, or phase success criteria, use `delegate-to-role` or a
prompt-overlay delegation to request bounded quality input.

When `.agents/roles/documentation-specialist.md` exists and the requested
update changes documentation impact, `_docs` placement, design-promotion
notes, README or workflow-doc expectations, index-link tasks, current-state
accuracy risks, documentation follow-up, or closeout docs expectations, use
`delegate-to-role` or a prompt-overlay delegation to request bounded
documentation input.

When `.agents/roles/implementation-engineer.md` exists and the requested
update changes task boundaries, phase sequencing, likely changed areas,
dependencies, implementation risks, verification handoff, documentation
impact, execution notes, or follow-on work, use `delegate-to-role` or a
prompt-overlay delegation to request bounded implementation input.

Fold returned evidence into the smallest appropriate plan update: scope,
Design Intent, non-goals, boundaries, tasks, risks, verification, Security
Review expectations, documentation impact, promotion notes, open questions, or
human-review notes. Do not require any role for direct use. If a role is
unavailable or the host cannot delegate, continue the plan update yourself by
checking the same specialty concerns when they apply.

## Workflow

1. Resolve the referenced plan. If none is referenced, infer one only when the
   user intent and active/backlog plan context identify exactly one plan.
2. Read `AGENTS.md`, `.agents/workflow.md`, `_docs/README.md`, relevant
   `_docs/kb` docs, and the target plan section. Read completed plans only for
   relevant historical decisions, regressions, or migrations.
3. Classify the plan location as active, backlog, or completed and state that
   classification before editing.
4. Apply the smallest plan-only edit that matches the user request: clarify
   scope, refine tasks, update status, record risks, add verification, capture
   lessons, or update promotion-to-design notes. Use the active workflow
   `plan.md` template as the shared artifact reference when restructuring a
   plan.
5. When editing task lists, preserve or repair the task status markers required
   by `.agents/workflow.md`: `⬜️` not started, `🟨` in progress, `✅`
   completed, and `⚠️` implemented or substantially complete with a known
   validation gap or follow-up risk. Do not leave Markdown task checkboxes such
   as `- [ ]` or `- [x]` in phased plan task lists.
6. When editing accepted backlog plans, keep acceptance status inline on the
   relevant section or phase heading, such as
   `## Design Intent (status: accepted)` or
   `### Phase 1: Name (status: accepted)`. Do not preserve or add a detached
   final `Review Gates` section when the intended accepted state is clear.
7. Preserve lifecycle boundaries: do not move plans between active, backlog,
   and completed locations unless the user explicitly requested that transition
   and the matching transition skill applies.
8. Run targeted document verification, usually `git diff --check` for the
   changed plan and any touched workflow docs.
9. Report files changed, verification, documentation impact, skipped checks,
   and whether escalation was needed.

## Guardrails

- Stop when the requested update would authorize backlog implementation,
  archive incomplete work, or make a product/security/data-safety decision not
  already supported by the plan or current knowledge-base docs.
- Before closing, scan touched plan task lists for stale checkbox syntax and
  convert it to the workflow status markers when the intended state is clear.
- Before closing an accepted backlog plan update, scan for detached review-gate
  summaries and move accepted status into the relevant headings when the mapping
  is clear.
- Keep execution history in plans and stable current-state truth in
  `_docs/kb`.
- Resolve `plan.md` from `.agents/templates/plan.md` first, then from the
  active workflow origin. If neither exists, follow the existing plan shape and
  report the missing template.
- Preserve unrelated worktree changes.
